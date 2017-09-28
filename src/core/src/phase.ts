import * as Bluebird from 'bluebird';
import { join, relative, dirname } from 'path';
import * as _ from 'lodash';
import { contains, check, OLHM, arrayify } from 'typed-json-transform';

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
import { Project } from './project';
import { errors } from './errors';
import { Ninja } from './ninja';

export class Phase implements TMake.Plugins {
  /* implements Plugins */
  replace: any;
  create: any;
  shell: any;
  ninja: Ninja;
  commands: TMake.CmdObj[];

  constructor(input) {
    this.commands = [];
    if (check(input, String)) {
      if (Runtime.getPlugin(input)) {
        this.commands.push({ cmd: input });
      } else {
        throw new Error(`plugin ${input} not loaded`);
      }
    } else if (check(input, Array)) {
      throw new Error('base of seection should not be an array, use a plugin name, or an object containing plugin configurations')
    } else if (check(input, Object)) {
      for (const k of Object.keys(input)) {
        if (Runtime.getPlugin(k)) {
          this.commands.push({ arg: input[k], cmd: k });
        } else if (contains(['create', 'replace'], k)) {
          this.commands.push({ arg: input[k], cmd: k });
        } else if (contains(['shell'], k)) {
          arrayify(input[k]).forEach((shellCmd) => {
            this.commands.push({ arg: '', cmd: shellCmd });
          });
        }
      }
    }
  }
}

export function configure(configuration: Configuration, isTest?: boolean): PromiseLike<any> {
  const phase = new Phase(configuration.parsed.configure);
  if (configuration.project.force() || configuration.cache.configure.dirty()) {
    return Bluebird.each(
      phase.commands,
      (i: TMake.CmdObj): PromiseLike<any> => {
        log.verbose(`    ${i.cmd}`);
        const handler = Runtime.getPlugin(i.cmd);
        if (handler) {
          return configuration.runPhaseWithPlugin({ phase: 'configure', pluginName: i.cmd });
        }
        switch (i.cmd) {
          case 'shell':
            return iterateOLHM(i.arg, (command: any) => {
              return configuration.sh(command);
            });
          case 'replace':
            return iterateOLHM(i.arg, (replEntry: ReplEntry) => {
              const pattern = arrayify(replEntry.matching);
              log.verbose(`replace in files matching ${pattern}`);
              return file.glob(pattern, undefined, configuration.project.parsed.d.source)
                .then((files: string[]) => {
                  return Bluebird.each(files, (file) => {
                    return replaceInFile(file, replEntry, configuration);
                  })
                })
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
          case 'copy':
            return iterateOLHM(i.arg,
              (e: { from: string, matching: string[], to: string }) => {
                log.quiet(`copy ${e}`);
                const fromDir = configuration.pathSetting(e.from);

                const patterns = e.matching;
                const options: TMake.Vinyl.Options = { from: fromDir, to: configuration.pathSetting(e.to) }
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
              });
        }
      }).then(() => {
        configuration.cache.configure.update();
        return configuration.update();
      });
  }
  log.verbose(`configuration is current, use --force=${configuration.project.parsed.name} if you suspect the cache is stale`);
  return Bluebird.resolve(configuration);
}


export function build(configuration: Configuration, isTest?: boolean): PromiseLike<any> {
  if (configuration.project.force() || configuration.cache.build.dirty()) {
    const phase = new Phase(configuration.parsed.build);
    return Bluebird.each(
      phase.commands,
      (i: TMake.CmdObj): PromiseLike<any> => {
        log.verbose(`    ${i.cmd}`);
        const handler = Runtime.getPlugin(i.cmd);
        if (handler) {
          return configuration.runPhaseWithPlugin({ phase: 'build', pluginName: i.cmd });
        }
        switch (i.cmd) {
          case 'shell':
            return iterateOLHM(i.arg, (command: any) => {
              return configuration.sh(command);
            });
        }
      }).then(() => {
        configuration.cache.build.update();
        return configuration.update();
      });
  }
  log.verbose(`configuration is current, use --force=${configuration.project.parsed.name} if you suspect the cache is stale`);
  return Bluebird.resolve(configuration);
}
