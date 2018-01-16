import * as Bluebird from 'bluebird';
import { exec as _exec, cd, mv, mkdir, which, ExecCallback, ExecOutputReturnValue } from 'shelljs';
import { existsSync } from 'fs';
import { Spinner } from 'cli-spinner';
import { check, map } from 'typed-json-transform';
import { log } from './log';
import { args } from './runtime';
import { Configuration, ConfigurationPlugin } from './configuration';
import { iterateOLHM } from './iterate';
import { errors, TMakeError } from './errors';
import { replaceAll } from './string';

export function exec(command: string, options: TMake.Shell.Exec.Options = {}): string {
  let out = _exec(command, options) as any;
  out = out.stdout || out.stderr;
  if (out) {
    if (out.slice(-1) == '\r') out = out.slice(0, out.length - 1);
    while (out.slice(-1) == '\n') {
      out = out.slice(0, out.length - 1);
    }
  }
  return out;
}

export function ensureCommand(command: string) {
  if (!which(command)) {
    log.error(`Sorry, this script requires command: ${command} to be in your PATH`);
    process.exit(1);
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
  return new Bluebird<string>((resolve: Function, reject: Function) => {
    let revert;
    if (cwd) {
      revert = process.cwd();
      cd(cwd);
    }
    const _silent = silent || !args.verbose
    var spinner = new Spinner(`%s ${short || truncate(command)}`);
    if (_silent) {
      spinner.setSpinnerString('|/-\\');
      spinner.start();
    }
    _exec(command, {
      silent: _silent
    }, <ExecCallback>(code: number, output: string, error: string) => {
      if (revert) {
        cd(revert);
      }
      if (_silent) {
        spinner.stop(true)
      }
      if ((code && error) || findErrors(output)) {
        if (args.dev) {
          throw new Error(error || findErrors(output));
        }
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

export function runCommand(configuration: Configuration, command: any) {
  const c: TMake.CmdObj = check(command, String) ?
    <TMake.CmdObj>{ cmd: command } :
    command;
  const cwd = configuration.pathSetting(c.cwd || configuration.project.parsed.d.source);
  log.verbose(`    ${c.cmd}`);
  return execAsync(
    c.cmd,
    <TMake.Shell.Exec.Options>{ cwd: cwd, silent: !args.quiet });
}


export class Shell extends ConfigurationPlugin {
  options: TMake.Plugin.Shell.Options;

  constructor(configuration: TMake.Configuration, options?: TMake.Plugin.Shell.Options) {
    super(configuration, options);
  }
  // OVERRIDE IN PLUGIN SUBCLASS
  configureCommand(toolpath?: string): string {
    return toolpath;
  }
  buildCommand(toolpath?: string) {
    return toolpath;
  }
  installCommand(toolpath?: string) {
    return toolpath;
  }
}
