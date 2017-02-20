import { exec as _exec, cd, mv, mkdir, which, exit, ExecOptions, ExecCallback, ExecOutputReturnValue } from 'shelljs';
import { log } from './log';
import child = require("child_process");

interface ShellOptions {
  silent?: boolean,
  cwd?: string;
}

function exec(command: string, options: ShellOptions = {}): string {
  const out = _exec(command, options) as any;
  return out.stdout ? out.stdout.replace('\r', '').replace('\n', '') : undefined;
}

function execAsync(command: string, {cwd, silent}: ShellOptions = {}) {
  return new Promise<string>((resolve: Function, reject: Function) => {
    if (cwd) cd(cwd);
    _exec(command, <ExecOptions>{
      silent: silent
    }, <ExecCallback>(code: number, output: string, error: string) => {
      if (error) {
        resolve(new Error(error));
      } else {
        resolve(output.replace('\r', '').replace('\n', ''))
      }
    });
  })
};

export { ShellOptions, exec, execAsync, cd, exit, mkdir, mv, which }
