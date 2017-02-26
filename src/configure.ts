import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import { arrayify, check } from 'js-object-tools';
import * as fs from 'fs';

import * as file from './file';
import { execAsync, ShellOptions } from './sh';
import { log } from './log';
import { deps } from './graph';
import { args } from './args';
import { replaceInFile, ReplEntry } from './parse';
import { updateEnvironment } from './db';
import { generate as cmake } from './cmake';
import { generate as ninja } from './ninja';
import { stringHash } from './hash';
import { CmdObj, iterateOLHM } from './iterate';

import { Environment } from './environment';
import { Project } from './project';
import { defaults } from './defaults';

export interface Configure {
  create?: any;
  replace?: any;
  shell?: any;
  cmake?: any;
  for?: any;
}

function copy(patterns: string[], options: file.VinylOptions) {
  const filePaths: string[] = [];
  return file
    .wait(file.src(patterns, { cwd: options.from, followSymlinks: false })
      .pipe(file.map((data: file.VinylFile, callback: Function) => {
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

function globHeaders(env: Environment) {
  const patterns = env.globArray(
    env.build.headers ? env.build.headers : defaults.headers.glob);
  return file.glob(patterns, env.d.source, env.d.source);
}

function globSources(env: Environment) {
  const patterns = env.globArray(
    env.build.sources || defaults.sources.glob);
  return file.glob(patterns, env.d.source, env.project.d.source);
}

function globFiles(env: Environment) {
  log.verbose('  gather files for build configuration');
  return globHeaders(env)
    .then((headers) => {
      env.build.headers = headers;
      return globSources(env);
    })
    .then((sources) => {
      env.s = sources;
      return deps(env.project);
    })
    .then((depGraph) => {
      if (depGraph.length) {
        const stack = depGraph.map((dep: Project) => {
          return _.map(dep.cache.libs.value(), (lib) => {
            console.log('+', path.join(dep.d.home, lib));
            return path.join(dep.d.home, lib);
          })
        })
        env.build.libs = _.flatten(stack);
      }
      env.build.includeDirs = _.union
        ([`${env.project.d.home}/include`], env.project.d.includeDirs);
      return Promise.resolve(env);
    });
}

interface StringObject {
  [key: string]: string;
}

function createBuildFileFor(env: Environment, systemName: string) {
  return generateConfig(env, systemName);
}

function generateConfig(env: Environment, systemName: string) {
  return globFiles(env)
    .then(() => { return generateBuildFile(env, systemName); })
    .then(() => {
      const buildFileName = env.getProjectFile(systemName);
      env.cache.buildFilePath.set(buildFileName);
      env.cache.generatedBuildFilePath.set(buildFileName);
      return updateEnvironment(env);
    });
}

function generateBuildFile(env: Environment, systemName: string) {
  env.ensureProjectFolder();
  const buildFile = env.getProjectFilePath(systemName);
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

function shCommand(env: Environment, command: any) {
  const c: CmdObj = check(command, String) ?
    <CmdObj>{ cmd: command } :
    command;
  const cwd = env.pathSetting(c.cwd || env.project.d.source);
  log.verbose(`    ${c.cmd}`);
  return execAsync(
    c.cmd,
    <ShellOptions>{ cwd: cwd, silent: !args.quiet });
}

export function configure(env: Environment, isTest?: boolean): PromiseLike<any> {
  if (env.project.force() || env.cache.configure.dirty()) {
    const commands = env.getConfigurationIterable();
    return Bluebird.each(
      commands,
      (i: CmdObj): PromiseLike<any> => {
        log.verbose(`  ${i.cmd}:`);
        switch (i.cmd) {
          case 'for':
            log.verbose(`    ${i.arg}`);
            return createBuildFileFor(env, i.arg);
          default:
            return shCommand(env, i.arg);
          case 'shell':
            return iterateOLHM(i.arg, (command: any) => {
              return shCommand(env, command);
            });
          case 'replace':
            return iterateOLHM(i.arg, (replEntry: ReplEntry) => {
              const pattern = env.globArray(replEntry.sources);
              return file.glob(pattern, undefined, env.project.d.source)
                .then((files: string[]) => {
                  return Bluebird.each(files, (file) => {
                    return replaceInFile(file, replEntry, env);
                  })
                })
            });
          case 'create':
            return iterateOLHM(
              i.arg, (entry: any) => {
                const filePath = path.join(env.project.d.source, entry.path);
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
      }).then(() => {
        env.cache.buildFile.update();
        env.cache.configure.update();
        return updateEnvironment(env);
      });
  }
  log.verbose(`configuration is current, use --force=${env.project.name} if you suspect the cache is stale`);
  return Promise.resolve(env);
}