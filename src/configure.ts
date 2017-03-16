
import { each } from 'bluebird';
import { join, relative, dirname } from 'path';
import { arrayify, check } from 'js-object-tools';


import * as file from './file';
import { execAsync, ensureCommand, ExecOptions } from './sh';
import { log } from './log';
import { deps } from './graph';
import { args } from './args';
import { replaceInFile, ReplEntry } from './parse';
import { updateEnvironment } from './db';
import { stringHash } from './hash';
import { CmdObj, iterateOLHM } from './iterate';
import { Plugin } from './plugin';
import { EnvironmentPlugin, Environment } from './environment';
import { BuildPhase, Project } from './project';
import { defaults } from './defaults';
import { CMakeOptions } from './cmake';

function copy(patterns: string[], options: file.VinylOptions) {
  const filePaths: string[] = [];
  return file
    .wait(file.src(patterns, { cwd: options.from, followSymlinks: false })
      .pipe(file.map((data: file.VinylFile, callback: Function) => {
        const mutable = data;
        log.verbose(`+ ${relative(mutable.cwd, mutable.path)}`);
        if (options.flatten) {
          mutable.base = dirname(mutable.path);
        }
        const newPath = join(
          options.to,
          relative(mutable.base, mutable.path));
        filePaths.push(
          relative(options.relative, newPath));
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
    env.build.matching || defaults.sources.glob);
  return file.glob(patterns, env.d.source, env.project.d.source);
}

export function configure(env: Environment, isTest?: boolean): PromiseLike<any> {
  if (env.project.force() || env.cache.configure.dirty()) {
    const commands = env.getConfigurationIterable();
    return each(
      commands,
      (i: CmdObj): PromiseLike<any> => {
        log.verbose(`  ${i.cmd}:`);
        const handler = Plugin.lookup(i.cmd);
        if (handler) {
          return env.runPhaseWithPlugin({ phase: 'configure', pluginName: i.cmd });
        }
        switch (i.cmd) {
          case 'shell':
            return iterateOLHM(i.arg, (command: any) => {
              return env.sh(command);
            });
          case 'replace':
            return iterateOLHM(i.arg, (replEntry: ReplEntry) => {
              const pattern = env.globArray(replEntry.matching);
              return file.glob(pattern, undefined, env.project.d.source)
                .then((files: string[]) => {
                  return each(files, (file) => {
                    return replaceInFile(file, replEntry, env);
                  })
                })
            });
          case 'create':
            return iterateOLHM(
              i.arg, (entry: any) => {
                const filePath = join(env.project.d.source, entry.path);
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
              (e: { from: string, matching: string[], to: string }) => {
                log.quiet(`copy ${e}`);
                const fromDir = env.pathSetting(e.from);
                return copy(
                  e.matching,
                  { from: fromDir, to: env.pathSetting(e.to) });
              });
        }
      }).then(() => {
        env.cache.configure.update();
        return updateEnvironment(env);
      });
  }
  log.verbose(`configuration is current, use --force=${env.project.name} if you suspect the cache is stale`);
  return Promise.resolve(env);
}