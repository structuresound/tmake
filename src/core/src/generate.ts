import * as Bluebird from 'bluebird';
import { join, relative, dirname } from 'path';
import { arrayify, check } from 'typed-json-transform';

import * as file from './file';
import { execAsync, ensureCommand } from './shell';
import { log } from './log';
import { deps } from './graph';
import { args } from './runtime';
import { replaceInFile, ReplEntry } from './parse';
import { stringHash } from './hash';
import { iterateOLHM } from './iterate';
import { Runtime } from './runtime';
import { ConfigurationPlugin, Configuration } from './configuration';
import { Product } from './project';
import { Phase } from './phase';

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

export function generate(configuration: Configuration, isTest?: boolean): PromiseLike<any> {
  const phase = new Phase(configuration.parsed.generate);
  if (configuration.project.force() || configuration.cache.generate.dirty()) {
    return Bluebird.each(
      phase.commands,
      (i: TMake.CmdObj): PromiseLike<any> => {
        log.verbose(`  ${i.cmd}:`);
        const handler = Runtime.getPlugin(i.cmd);
        if (handler) {
          return configuration.runPhaseWithPlugin({ phase: 'generate', pluginName: i.cmd });
        }
        switch (i.cmd) {
          case 'shell':
            return iterateOLHM(i.arg, (command: any) => {
              return configuration.sh(command);
            });
          case 'create':
            return iterateOLHM(
              i.arg, (entry: any) => {
                const filePath = join(configuration.project.parsed.d.source, entry.path);
                const existing = file.readIfExists(filePath);
                if (existing !== entry.string) {
                  log.verbose(`create file ${filePath}`);
                  return file.writeFileAsync(filePath, entry.string,
                    { encoding: 'utf8' });
                }
                return Bluebird.resolve();
              });
        }
      }).then(() => {
        configuration.cache.generate.update();
        return configuration.update();
      });
  }
  log.verbose(`configuration is current, use --force=${configuration.project.name} if you suspect the cache is stale`);
  return Bluebird.resolve(configuration);
}
