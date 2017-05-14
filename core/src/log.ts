/*  eslint no-console: ["off"] */

import { dump, DumpOptions } from 'js-yaml';
import * as colors from 'chalk';
import { check, map } from 'typed-json-transform';
import { args as environment } from './runtime';

function yamlify(...args: any[]): string {
  return map(args, (el: any) => {
    if (check(el, String)) {
      return el;
    }
    if (check(el, Array)) {
      if (check(el[0], Object)) {
        return '---\n' + dump(el, <DumpOptions>{ sortKeys: true });
      }
      return '[' + el.join(', ') + ']';
    }
    if (check(el, Object)) {
      return '---\n' + dump(el, <DumpOptions>{ sortKeys: true });
    }
    return '' + el;
  }).join(' ');
}

function white(...args: any[]) { console.log(colors.white(yamlify(...args))); }
function gray(...args: any[]) { console.log(colors.gray(yamlify(...args))); }

export class Log {
  getMessage(...args: any[]): string { return yamlify(args); }

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
  info(...args: any[]) { console.log(colors.blue(yamlify(...args))); }
  warn(...args: any[]) { console.log(colors.yellow(yamlify(...args))); }
  add(...args: any[]) {
    if (!environment.quiet) {
      console.log(colors.green(yamlify(...args)));
    }
  }
  error(...args: any[]) { console.log(colors.red(yamlify(...args))); }
  throw(...args: any[]) {
    throw new Error(yamlify(...args));
  }
  parse(...args: any[]) { return yamlify(args); }
}

export const log = new Log();