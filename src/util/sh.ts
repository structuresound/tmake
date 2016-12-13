import {exec as _exec, cd, mv, mkdir, which, exit, ExecOptions, ExecCallback, ExecOutputReturnValue} from 'shelljs';
import log from './log';
import child = require("child_process");

interface ShellOptions {
  silent?: boolean,
  cwd?: string;
}

function exec(command: string, options: ShellOptions): string {
  const out = _exec(command, options) as ExecOutputReturnValue;
  return out.output.replace('\r', '').replace('\n', '');
}

function execAsync(command: string, options: ShellOptions): Promise<any> {
  return new Promise((resolve: Function, reject: Function) => {
  if (options.cwd) cd(options.cwd);
  _exec(command, <ExecOptions>{
    silent: options.silent
  }, <ExecCallback>(code: number, output: string, error: string) => {
    if (error){
  resolve(new Error(error));
    } else {
    resolve(output.replace('\r', '').replace('\n', ''))
    }
  });
})
}
;

export {exec, execAsync, ShellOptions, cd, exit, mkdir, mv, which}
