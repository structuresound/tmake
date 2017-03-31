import { exec as _exec, cd, mv, mkdir, which, exit, ExecCallback, ExecOutputReturnValue } from 'shelljs';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { Spinner } from 'cli-spinner';
import { check, map } from 'typed-json-transform';
import { Property as CacheProperty } from './cache';
import { fileHash, fileHashSync } from './hash';
import { log } from './log';
import { args } from './args';
import { errors, TMakeError } from './errors';
import { Environment, EnvironmentPlugin } from './environment';
import { iterateOLHM } from './iterate';


export function exec(command: string, options: TMake.Shell.Exec.Options = {}): string {
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

export function execAsync(command: string, { cwd, silent, short }: TMake.Shell.Exec.Options = {}) {
  return new Promise<string>((resolve: Function, reject: Function) => {
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

export function runCommand(env: Environment, command: any) {
  const c: TMake.CmdObj = check(command, String) ?
    <TMake.CmdObj>{ cmd: command } :
    command;
  const cwd = env.pathSetting(c.cwd || env.project.d.source);
  log.verbose(`    ${c.cmd}`);
  return execAsync(
    c.cmd,
    <TMake.Shell.Exec.Options>{ cwd: cwd, silent: !args.quiet });
}


export class ShellPlugin extends EnvironmentPlugin {
  options: TMake.Plugin.Shell.Options;

  constructor(env: TMake.Environment, options?: TMake.Plugin.Shell.Options) {
    super(env, options);
  }

  public configure() {
    this.ensureProjectFile();
    const buildFilePath = this.buildFilePath();
    const buildFileDir = dirname(buildFilePath);
    console.log('check cache for matching file', buildFilePath);
    if (!this.environment.cache[this.name + '_configure']) {
      this.environment.cache[this.name + '_configure'] = new CacheProperty<string>(() => {
        return fileHashSync(buildFilePath);
      });
    }
    const buildFileCache = this.environment.cache[this.name + '_configure'];
    try {
      if (buildFileCache.value() === fileHashSync(buildFilePath)) {
        return Promise.resolve();
      }
    } catch (e) {

    }
    console.log('dirty, exec', this.configureCommand());
    mkdir('-p', this.environment.d.build);
    return execAsync(this.configureCommand(), { cwd: buildFileDir, silent: !args.quiet }).then(() => {
      buildFileCache.update();
      this.environment.cache.update();
    });
  }
  public build() {
    this.ensureBuildFile();
    return this.fetch().then((toolpaths: any) => {
      const command = this.buildCommand(this.toolpaths);
      if (command) {
        const wd = dirname(this.buildFilePath());
        log.verbose(command);
        return execAsync(command, {
          cwd: wd,
          silent: !args.verbose,
          short: this.name
        });
      }
      throw new Error(`no build command for shell plugin ${this.name}`);
    });
  }
  public install() {
    const installCommand = this.installCommand();
    if (installCommand) {
      const wd = dirname(this.buildFilePath());
      return execAsync(installCommand, {
        cwd: wd,
        silent: !args.verbose,
        short: this.name
      });
    }
  }
  public ensureProjectFile(isTest?: boolean) {
    const filePath = this.projectFilePath();
    if (!check(filePath, 'String')) {
      throw new Error('no build file specified');
    }
    if (!existsSync(filePath)) {
      errors.configure.noProjectFile(this);
    }
  }
  public ensureBuildFile(isTest?: boolean) {
    const buildFilePath = this.buildFilePath();
    if (!check(buildFilePath, 'String')) {
      throw new Error('no build file specified');
    }
    if (!existsSync(buildFilePath)) {
      errors.build.noBuildFile(this);
    }
  }
  // OVERRIDE IN PLUGIN SUBCLASS
  projectFilePath() {
    return join(this.environment.d.project, this.projectFileName);
  }
  buildFilePath() {
    return join(this.environment.d.build, this.buildFileName);
  }
  configureCommand(toolpaths?: string): string {
    return undefined;
  }
  buildCommand(toolpaths?: string) {
    return undefined;
  }
  installCommand(toolpaths?: string) {
    return undefined;
  }
}

export { cd, exit, mkdir, mv, which }
