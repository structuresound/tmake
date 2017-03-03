import { exec as _exec, cd, mv, mkdir, which, exit, ExecCallback, ExecOutputReturnValue } from 'shelljs';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import { existsSync } from 'fs';
import { Spinner } from 'cli-spinner';
import { check } from 'js-object-tools';

import { CacheProperty } from './cache';
import { fileHash, fileHashSync } from './hash';
import { log } from './log';
import { args } from './args';
import { errors, TMakeError } from './errors';
import { PluginOptions } from './plugin';
import { EnvironmentPlugin } from './environment';

interface ExecOptions {
  silent?: boolean
  cwd?: string
  short?: string
}

export function exec(command: string, options: ExecOptions = {}): string {
  const out = _exec(command, options) as any;
  return out.stdout ? out.stdout.replace('\r', '').replace('\n', '') : undefined;
}

export function ensureCommand(command: string) {
  if (!which(command)) {
    log.error('Sorry, this script requires git');
    return exit(1);
  }
}

const showStoppers = [
  'ninja: build stopped: subcommand failed',
  'tmake error report'
]

function findErrors(body: string) {
  for (const s of showStoppers) {
    if (body.indexOf(s) !== -1) {
      return s;
    }
  }
  return undefined;
}

const maxSpinnerLength = 32;
function truncate(s) {
  if (s.length > maxSpinnerLength) {
    return s.substring(0, maxSpinnerLength) + '... (--verbose)';
  }
  return s;
}

export function execAsync(command: string, { cwd, silent, short }: ExecOptions = {}) {
  return new Bluebird<string>((resolve: Function, reject: Function) => {
    if (cwd) cd(cwd);
    const _silent = silent || !args.verbose
    var spinner = new Spinner(`%s ${short || truncate(command)}`);
    if (_silent) {
      spinner.setSpinnerString('|/-\\');
      spinner.start();
    }
    _exec(command, {
      silent: _silent
    }, <ExecCallback>(code: number, output: string, error: string) => {
      if (_silent) {
        spinner.stop(true)
      }
      if ((code && error) || findErrors(output)) {
        return errors.shell.report({ command, output, cwd, short }).then((error) => {
          reject(error);
        });
      } else if (error) {
        log.warn(error || output);
        resolve(output.replace('\r', '').replace('\n', ''))
      } else {
        resolve(output.replace('\r', '').replace('\n', ''))
      }
    });
  })
};

export class ShellPlugin<T> extends EnvironmentPlugin<T> {
  public configure() {
    this.ensureProjectFile();
    const buildFile = this.buildFilePath(this.environment.d);
    if (!this.environment.cache[this.name + '_configure']) {
      this.environment.cache[this.name + '_configure'] = new CacheProperty<string>(() => {
        return fileHashSync(buildFile);
      });
    }
    const buildFileCache = this.environment.cache[this.name + '_configure'];
    return fileHash(buildFile).then((buildFileHash) => {
      if (existsSync(buildFile) && buildFileCache.value() === buildFileHash) {
        return Promise.resolve();
      }
      return execAsync(this.configureCommand()).then(() => {
        buildFileCache.update();
        this.environment.cache.update();
      });
    });
  }
  public build() {
    this.ensureBuildFile();
    return this.fetch().then((toolpaths: any) => {
      const command = this.buildCommand(this.toolpaths);
      const wd = path.dirname(this.buildFilePath(this.environment.d));
      log.verbose(command);
      return execAsync(command, {
        cwd: wd,
        silent: !args.verbose,
        short: 'cmake'
      });
    });
  }
  public ensureProjectFile(isTest?: boolean) {
    const filePath = this.projectFilePath(this.environment.d);
    if (!check(filePath, 'String')) {
      throw new Error('no build file specified');
    }
    if (!existsSync(filePath)) {
      errors.configure.noProjectFile(this);
    }
  }
  public ensureBuildFile(isTest?: boolean) {
    const buildFilePath = this.buildFilePath(this.environment.d);
    if (!check(buildFilePath, 'String')) {
      throw new Error('no build file specified');
    }
    if (!existsSync(buildFilePath)) {
      errors.build.noBuildFile(this);
    }
  }
  // OVERRIDE IN PLUGIN SUBCLASS
  projectFilePath(directories) {
    return path.join(directories.project, this.projectFileName);
  }
  buildFilePath(directories) {
    return path.join(directories.build, this.buildFileName);
  }
  configureCommand(toolpaths?: string): string {
    return this.name;
  }
  buildCommand(toolpaths?: string) {
    return this.name;
  }
}

export { ExecOptions, cd, exit, mkdir, mv, which }
