import { exec as _exec, cd, mv, mkdir, which, exit, ExecOptions, ExecCallback, ExecOutputReturnValue } from 'shelljs';
import { log } from './log';
import { args } from './args';

import { Spinner } from 'cli-spinner';

interface ShellOptions {
  silent?: boolean
  cwd?: string
  short?: string
}

function exec(command: string, options: ShellOptions = {}): string {
  const out = _exec(command, options) as any;
  return out.stdout ? out.stdout.replace('\r', '').replace('\n', '') : undefined;
}


function execAsync(command: string, {cwd, silent, short}: ShellOptions = {}) {
  return new Promise<string>((resolve: Function, reject: Function) => {
    if (cwd) cd(cwd);
    const _silent = silent || !args.verbose
    var spinner = new Spinner(`${short || command} %s`);
    if (_silent) {
      spinner.setSpinnerString('|/-\\');
      spinner.start();
    }
    _exec(command, <ExecOptions>{
      silent: _silent
    }, <ExecCallback>(code: number, output: string, error: string) => {
      if (_silent) {
        spinner.stop(true)
      }
      if (error) {
        if (code) {
          reject(new Error(error));
        } else {
          log.warn(error);
          resolve();
        }
      } else {
        resolve(output.replace('\r', '').replace('\n', ''))
      }
    });
  })
};

export { ShellOptions, exec, execAsync, cd, exit, mkdir, mv, which }
