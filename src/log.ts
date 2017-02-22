/*  eslint no-console: ["off"] */

import * as _ from 'lodash';
import { dump, DumpOptions } from 'js-yaml';
import * as colors from 'chalk';
import { check } from 'js-object-tools';
import { args as environment } from './args';

function getMessage(...args: any[]): string {
  return _.map(args, (el: any) => {
    if (check(el, String)) {
      return el;
    }
    if (check(el, Array)) {
      if (check(el[0], Object)) {
        return '\n---\n' + dump(el, <DumpOptions>{ sortKeys: true });
      }
      return '[' + el.join(', ') + ']';
    }
    if (check(el, Object)) {
      return '\n---\n' + dump(el, <DumpOptions>{ sortKeys: true });
    }
    return '' + el;
  }).join(' ');
}

function white(...args: any[]) { console.log(colors.white(getMessage(...args))); }
function gray(...args: any[]) { console.log(colors.gray(getMessage(...args))); }

class Log {
  getMessage(...args: any[]): string { return getMessage(args); }

  log(...args: any[]) {
    white(...args);
  }
  verbose(...args: any[]) {
    if (environment.verbose) {
      gray(...args);
    }
  }
  quiet(...args: any[]) {
    if (!environment.quiet || environment.verbose) {
      gray(...args);
    }
  }
  dev(...args: any[]) {
    if (environment.dev) {
      return this.log(...args);
    }
  }
  info(...args: any[]) { console.log(colors.blue(getMessage(...args))); }
  warn(...args: any[]) { console.log(colors.yellow(getMessage(...args))); }
  add(...args: any[]) {
    if (!environment.quiet) {
      console.log(colors.green(getMessage(...args)));
    }
  }
  error(...args: any[]) { console.log(colors.red(getMessage(...args))); }
  throw(...args: any[]) {
    throw new Error(getMessage(...args));
  }
  parse(...args: any[]) { return getMessage(args); }
}

const log = new Log();
export { Log, log };