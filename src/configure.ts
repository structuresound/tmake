import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as path from 'path';
import {diff, check} from 'js-object-tools';
import * as fs from 'fs';

import * as file from './util/file';
import {execAsync, ShellOptions} from './util/sh';
import log from './util/log';

import {deps} from './graph';
import args from './util/args';
import {replaceInFile, ReplEntry} from './parse';

import {updateNode} from './db';

import {generate as cmake} from './cmake';
import {generate as ninja} from './ninja';

import {stringHash} from './util/hash';

import {iterate, iterable} from './iterate';

import {Node} from './node';
import {Configuration, CmdObj} from './configuration';

function copy(patterns: string[], options: file.CopyOptions): Promise<any> {
  const filePaths: string[] = [];
  return file
      .wait(file.src(patterns, {cwd: options.from, followSymlinks: false})
                .pipe(file.map((data: file.VinylFile, callback: Function) =>
                               {
                                 const mutable = data;
                                 log.verbose(`+ ${path.relative(mutable.cwd, mutable.path)}`);
                                 if (options.flatten) {
                                   mutable.base = path.dirname(mutable.path);
                                 }
                                 const newPath = path.join(
                                     options.to,
                                     path.relative(mutable.base, mutable.path));
                                 filePaths.push(
                                     path.relative(options.relative, newPath));
                                 return callback(null, file);
                               }))
                .pipe(file.dest(options.to)))
      .then(() => { return Promise.resolve(filePaths); });
}

function globHeaders(node: Node): Promise<any> {
  const patterns = node.globArray(
      node.configuration.headers ? node.configuration.headers : [
        '**/*.h',
        '**/*.hpp',
        '**/*.ipp',
        '!test/**',
        '!tests/**',
        '!build/**'
      ]);
  return Promise.map(node.d.includeDirs,
                     (includePath) =>
                     {
                       return file.glob(patterns, node.d.project, includePath);
                     })
      .then((stack) => { return Promise.resolve(_.flatten(stack)); });
}

function globSources(node: Node): Promise<any> {
  const patterns = node.globArray(
      node.configuration.sources ?
          node.configuration.sources :
          ['**/*.cpp', '**/*.cc', '**/*.c', '!test/**', '!tests/**']);
  return file.glob(patterns, node.d.project, node.d.source);
}

function globFiles(node: Node): Promise<any> {
  return globHeaders(node)
      .then((headers) =>
            {
              node.configuration.headers = headers;
              return globSources(node);
            })
      .then((sources) =>
            {
              node.s = sources;
              return deps(node);
            })
      .then((depGraph) => {
        if (depGraph.length) {
          log.verbose('deps', depGraph);
          node.configuration.libs =
              _.chain(depGraph).map((dep: Node) => {
                                 return _.map(dep.libs, (lib) => {
                                   return path.join(dep.d.home, lib);
                                 });
                               }).flatten().value().reverse() as string[];
        }
        node.configuration.includeDirs = _.union
        ([`${node.d.home}/include`], node.d.includeDirs);
        return Promise.resolve(node);
      });
}

interface StringObject {
  [key: string]: string;
}

function getBuildFile(node: Node, systemName: string): string {
  const buildFileNames: StringObject = {
    ninja: 'build.ninja',
    cmake: 'CMakeLists.txt',
    gyp: 'binding.gyp',
    make: 'Makefile',
    xcode: `${node.name}.xcodeproj`
  };
  return buildFileNames[systemName];
}

function getBuildFilePath(node: Node, systemName: string) {
  return path.join(node.d.project, getBuildFile(node, systemName));
}

function createBuildFileFor(node: Node, systemName: string): Promise<any> {
  return file.existsAsync(getBuildFilePath(node, systemName))
      .then((exists) => {
        if (exists) {
          const buildFileName = getBuildFile(node, systemName);
          log.quiet(`using pre-existing build file ${buildFileName}`);
          return updateNode(node, {$set: {'cache.buildFile': buildFileName}});
        }
        return generateConfig(node, systemName);
      });
}

function generateConfig(node: Node, systemName: string): Promise<any> {
  return globFiles(node)
      .then(() => { return generateBuildFile(node, systemName); })
      .then(() => { return processConfig(node, systemName); });
}

function generateBuildFile(node: Node, systemName: string): Promise<any> {
  const buildFile = getBuildFilePath(node, systemName);
  switch (systemName) {
    case 'ninja':
      return Promise.resolve(ninja(node, buildFile));
    case 'cmake':
      return cmake(node).then((CMakeLists) => {
                          return file.writeFileAsync(buildFile, CMakeLists);
                        }).then((conf) => { return Promise.resolve(conf); });
    default:
      throw new Error(`bad build system ${systemName}`);
  }
}

function processConfig(node: Node, systemName: string): Promise<any> {
  const buildFileName = getBuildFile(node, systemName);
  return updateNode(node, {
    $set: {
      'cache.buildFile': buildFileName,
      'cache.generatedBuildFile': buildFileName
    }
  });
}

function reportStale(node: Node, current: string) {
  const url = node.url();
  const urlHash = node.urlHash();
  if (node.cache.url !== urlHash) {
    log.error(`hash ${node.cache.url} is stale, now ${urlHash}`);
    log.error(`url ${node.cache.debug.url} is stale, now ${url}`);
  } else {
    log.error(`${node.name} configuration ${node.cache.metaConfiguration} is stale, now ${current}`);
    log.error(node.cache.debug.metaConfiguration)
        log.add(node.configuration.serialize());
  }
}

function isStale(node: Node): boolean {
  const configHash = node.configHash();
  if (node.cache.metaConfiguration) {
    if (configHash !== node.cache.metaConfiguration) {
      reportStale(node, configHash);
      return true;
    }
    return false;
  }
  return true;
}

function configure(node: Node, isTest: boolean): Promise<any> {
  if (!node.configuration) {
    throw new Error('configure without node');
  }
  if (node.force() || isStale(node)) {
    const commands = node.configuration.getCommands();
    return Promise
        .each(
            commands,
            (i: CmdObj) =>
            {
              log.verbose(`configure >> ${i.cmd}`);
              switch (i.cmd) {
                case 'with':
                  log.verbose(`configure for: ${i.arg}`);
                  return createBuildFileFor(node, i.arg);
                case 'ninja':
                case 'cmake':
                  return createBuildFileFor(node, i.cmd);
                default:
                case 'shell':
                  return Promise.each(diff.arrayify(i.arg), (command: any) => {
                    const c: CmdObj = check(command, String) ?
                                          <CmdObj>{cmd: command} :
                                          command;
                    const setting = node.pathSetting(c.cwd || node.d.source);
                    return execAsync(
                        node.parse(c.cmd, node),
                        <ShellOptions>{cwd: setting, silent: !args.quiet});
                  });
                case 'replace':
                  return Promise.each(
                      iterable(i.arg), (replEntry: ReplEntry) => {
                        const pattern = node.globArray(replEntry.sources);
                        return file.glob(pattern, undefined, node.d.source)
                            .then((files: string[]): Promise<any >=> {
                              return Promise.each(files, (file) => {
                                return replaceInFile(file, replEntry, node);
                              });
                            });
                      });
                case 'create':
                  return iterate(
                      i.arg, (entry: {string: string, path: string}) => {
                        const filePath = path.join(node.d.source, entry.path);
                        const existing = file.readIfExists(filePath);
                        if (existing !== entry.string) {
                          log.verbose(`create file ${filePath}`);
                          return file.writeFileAsync(filePath, entry.string,
                                                     {encoding: 'utf8'});
                        }
                      });
                case 'copy':
                  return Promise.each(
                      diff.arrayify(i.arg),
                      (e: {from: string, sources: string[], to: string}) => {
                        log.quiet(`copy ${e}`);
                        const fromDir = node.pathSetting(e.from);
                        return copy(
                            e.sources,
                            {from: fromDir, to: node.pathSetting(e.to)});
                      });
              }
            })
        .then((): Promise<any >=> {
          return updateNode(node, {
            $set: {
              'cache.metaConfiguration': node.configHash(),
              'cache.debug.metaConfiguration': node.configuration.serialize()
            }
          });
        });
  }
  log.verbose(`configuration is current, use --force=${node.name} if you suspect the cache is stale`);
  return Promise.resolve(node);
}

function destroy(node: Node): Promise<any> {
  return updateNode(node, {
    $unset: {
      'cache.metaConfiguration': true,
      'cache.debug.metaConfiguration': true
    }
  });
}

export {isStale, configure, destroy, getBuildFile};
