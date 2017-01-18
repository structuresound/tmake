import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as path from 'path';
import { arrayify, check } from 'js-object-tools';
import * as fs from 'fs';

import * as file from './file';
import { execAsync, ShellOptions } from './util/sh';
import { log } from './util/log';

import { deps } from './graph';
import args from './util/args';
import { replaceInFile, ReplEntry } from './parse';

import { updateEnvironment } from './db';

import { generate as cmake } from './cmake';
import { generate as ninja } from './ninja';

import { stringHash } from './util/hash';

import { iterateOLHM } from './iterate';

import { Environment } from './environment';

function copy(patterns: string[], options: schema.CopyOptions): Promise<any> {
  const filePaths: string[] = [];
  return file
    .wait(file.src(patterns, { cwd: options.from, followSymlinks: false })
      .pipe(file.map((data: schema.VinylFile, callback: Function) => {
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

function globHeaders(env: Environment): Promise<any> {
  const patterns = env.globArray(
    env.build.headers ? env.build.headers : [
      '**/*.h',
      '**/*.hpp',
      '**/*.ipp',
      '!test/**',
      '!tests/**',
      '!build/**'
    ]);
  return Promise.map(env.d.includeDirs,
    (includePath: string) => {
      return file.glob(patterns, env.d.project, includePath);
    })
    .then((stack) => { return Promise.resolve(_.flatten(stack)); });
}

function globSources(env: Environment): Promise<any> {
  const patterns = env.globArray(
    env.build.sources || ['**/*.cpp', '**/*.cc', '**/*.c', '!test/**', '!tests/**']);
  return file.glob(patterns, env.d.project, env.d.source);
}

function globFiles(env: Environment): Promise<any> {
  return globHeaders(env)
    .then((headers) => {
      env.build.headers = headers;
      return globSources(env);
    })
    .then((sources) => {
      env.s = sources;
      return deps(<any>env.project);
    })
    .then((depGraph) => {
      if (depGraph.length) {
        log.verbose('deps', depGraph);
        env.project.libs =
          _.chain(depGraph).map((dep: Project) => {
            return _.map(dep.libs, (lib) => {
              return path.join(dep.d.home, lib);
            });
          }).flatten().value().reverse() as string[];
      }
      env.build.includeDirs = _.union
        ([`${env.d.home}/include`], env.d.includeDirs);
      return Promise.resolve(env);
    });
}

interface StringObject {
  [key: string]: string;
}

function createBuildFileFor(env: Environment, systemName: string): Promise<any> {
  return file.existsAsync(env.getBuildFilePath(systemName))
    .then((exists) => {
      if (exists) {
        const buildFileName = env.getBuildFile(systemName);
        log.quiet(`using pre-existing build file ${buildFileName}`);
        return updateEnvironment(env, { $set: { 'cache.generatedBuildFilePath': buildFileName } });
      }
      return generateConfig(env, systemName);
    });
}

function generateConfig(env: Environment, systemName: string): Promise<any> {
  return globFiles(env)
    .then(() => { return generateBuildFile(env, systemName); })
    .then(() => {
      const buildFileName = getBuildFile(env, systemName);
      return updateEnvironment(env, {
        $set: {
          'cache.buildFilePath': buildFileName,
          'cache.generatedBuildFilePath': buildFileName
        }
      });
    });
}

function generateBuildFile(env: Environment, systemName: string): Promise<any> {
  const buildFile = getBuildFilePath(env, systemName);
  switch (systemName) {
    case 'ninja':
      return Promise.resolve(ninja(env, buildFile));
    case 'cmake':
      const CMakeLists = cmake(env);
      return file.writeFileAsync(buildFile, CMakeLists).then((conf) => { return Promise.resolve(conf); });
    default:
      throw new Error(`bad build system ${systemName}`);
  }
}

function configure(env: Environment, isTest: boolean): Promise<any> {
  if (env.project.force() || env.cache.configure.dirty()) {
    const commands = env.getConfigurationIterable();
    return Promise
      .each(
      commands,
      (i: schema.CmdObj) => {
        log.verbose(`configure >> ${i.cmd}`);
        switch (i.cmd) {
          case 'for':
            log.verbose(`configure for: ${i.arg}`);
            return createBuildFileFor(env, i.arg);
          case 'ninja':
          case 'cmake':
            return createBuildFileFor(env, i.cmd);
          default:
          case 'shell':
            return iterateOLHM(i.arg, (command: any) => {
              const c: schema.CmdObj = check(command, String) ?
                <schema.CmdObj>{ cmd: command } :
                command;
              const setting = env.pathSetting(c.cwd || env.d.source);
              return execAsync(
                env.parse(c.cmd, env),
                <ShellOptions>{ cwd: setting, silent: !args.quiet });
            });
          case 'replace':
            return iterateOLHM(i.arg, (replEntry: ReplEntry) => {
              const pattern = env.globArray(replEntry.sources);
              return file.glob(pattern, undefined, env.d.source)
                .then((files: string[]): Promise<any> => {
                  return Promise.each(files, (file) => {
                    return replaceInFile(file, replEntry, env);
                  });
                });
            });
          case 'create':
            return iterateOLHM(
              i.arg, (entry: any) => {
                const filePath = path.join(env.d.source, entry.path);
                const existing = file.readIfExists(filePath);
                if (existing !== entry.string) {
                  log.verbose(`create file ${filePath}`);
                  return file.writeFileAsync(filePath, entry.string,
                    { encoding: 'utf8' });
                }
                return Promise.resolve();
              });
          case 'copy':
            return iterateOLHM(i.arg,
              (e: { from: string, sources: string[], to: string }) => {
                log.quiet(`copy ${e}`);
                const fromDir = env.pathSetting(e.from);
                return copy(
                  e.sources,
                  { from: fromDir, to: env.pathSetting(e.to) });
              });
        }
      })
  }
  log.verbose(`configuration is current, use --force=${env.project.name} if you suspect the cache is stale`);
  return Promise.resolve(env);
}

export { configure, getBuildFile, getBuildFilePath};
