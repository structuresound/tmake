import * as Bluebird from 'bluebird';
import { join, relative, dirname } from 'path';
import { arrayify, check } from 'typed-json-transform';

import * as file from 'tmake-file';
import { execAsync, ensureCommand } from './shell';
import { log } from './log';
import { deps } from './graph';
import { args } from './runtime';
import { replaceInFile, ReplEntry } from './parse';
import { stringHash } from './hash';
import { iterateOLHM } from './iterate';
import { Runtime } from './runtime';
import { EnvironmentPlugin, Environment } from './environment';
import { Project } from './project';
import { Phase } from './phase';
import { defaults } from './defaults';

function copy(patterns: string[], options: TMake.Vinyl.Options) {
  const filePaths: string[] = [];
  return file
    .wait(file.src(patterns, { cwd: options.from, followSymlinks: false })
      .pipe(file.map((data: TMake.Vinyl.File, callback: Function) => {
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
    .then(() => { return Bluebird.resolve(filePaths); });
}

export function generate(env: Environment, isTest?: boolean): PromiseLike<any> {
  const phase = new Phase(env.generate);
  if (env.project.force() || env.cache.generate.dirty()) {
    return Bluebird.each(
      phase.commands,
      (i: TMake.CmdObj): PromiseLike<any> => {
        log.verbose(`  ${i.cmd}:`);
        const handler = Runtime.getPlugin(i.cmd);
        if (handler) {
          return env.runPhaseWithPlugin({ phase: 'generate', pluginName: i.cmd });
        }
        switch (i.cmd) {
          case 'shell':
            return iterateOLHM(i.arg, (command: any) => {
              return env.sh(command);
            });
          case 'replace':
            return iterateOLHM(i.arg, (replEntry: ReplEntry) => {
              const pattern = arrayify(replEntry.matching);
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
                const filePath = join(env.project.d.source, entry.path);
                const existing = file.readIfExists(filePath);
                if (existing !== entry.string) {
                  log.verbose(`create file ${filePath}`);
                  return file.writeFileAsync(filePath, entry.string,
                    { encoding: 'utf8' });
                }
                return Bluebird.resolve();
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
        env.cache.generate.update();
        return env.update();
      });
  }
  log.verbose(`configuration is current, use --force=${env.project.name} if you suspect the cache is stale`);
  return Bluebird.resolve(env);
}