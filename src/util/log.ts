/*  eslint no-console: ["off"] */

import * as _ from 'lodash';
import {dump, DumpOptions} from 'js-yaml';
import * as colors from 'chalk';
import {check} from 'js-object-tools';
import environment from './_args';

const debug = true;

function getMessage(... args: any[]): string {
  return _.map(args, (el: any) => {
            if (check(el, String)) {
              return el;
            }
            if (check(el, Array)) {
              if (check(el[0], Object)) {
                return '\n---\n' + dump(el, <DumpOptions>{sortKeys: true});
              }
              return '[' + el.join(', ') + ']';
            }
            if (check(el, Object)) {
              return '\n---\n' + dump(el, <DumpOptions>{sortKeys: true});
            }
            return '' + el;
          }).join(' ');
}

class Log {
  log(... args: any[]) { console.log(colors.white(getMessage(... args))); }
  verbose(... args: any[]) {
    if (environment.verbose) {
      console.log(colors.gray(getMessage(... args)));
    }
  }
  quiet(... args: any[]) {
    if (!environment.quiet || environment.verbose) {
      return this.log(... args);
    }
  }
  debug(... args: any[]) {
    if (environment.verbose || debug) {
      return this.log(... args);
    }
  }
  info(... args: any[]) { console.log(colors.blue(getMessage(... args))); }
  warn(... args: any[]) { console.log(colors.yellow(getMessage(... args))); }
  add(... args: any[]) {
    if (!environment.quiet) {
      console.log(colors.green(getMessage(... args)));
    }
  }
  error(... args: any[]) { console.log(colors.red(getMessage(... args))); }
  throw(... args: any[]) {
    console.log(colors.magenta(getMessage(... args)));
    throw new Error('log wants you to stop and look at the magenta message');
  }
  parse(... args: any[]) { return getMessage(args); }
}

export default new Log();