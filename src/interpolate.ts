import * as _ from 'lodash';
import { valueForKeyPath, check } from 'js-object-tools';

import { log } from './log';

function defaultLookup(key: string, data: { [index: string]: any }) {
  if (key in data) {
    return data[key];
  }
  // look up the chain
  const keyParts = key.split('.');
  if (keyParts.length > 1) {
    const repl = valueForKeyPath(key, data);
    return repl;
  }
}

export interface InterpolateOptions {
  [index: string]: any;
  ref?: { [index: string]: any }
  mustPass?: boolean
}

function _interpolate(template: string, func: Function | Object,
  opt: InterpolateOptions): string {
  const commands = template.match(/\$\{[^}\r\n]*\}/g);
  if (commands) {
    if (commands[0].length ===
      template.length) {  // allow for object replacement of single command
      const res = (<Function>func)(commands[0].slice(2, -1));
      if (check(res, String)) {
        return _interpolate(res, func, opt);
      }
      return res || template;
    }
    let interpolated = _.clone(template);
    let modified = false;
    for (const c of commands) {
      const lookup = (<Function>func)(c.slice(2, -1));
      if (lookup) {
        modified = true;
        interpolated = interpolated.replace(c, lookup);
      } else if (opt.mustPass) {
        throw new Error(`no value for required keypath ${c} in interpolation stack ${log.parse(opt.ref)}`);
      }
    }
    if (modified) {
      return _interpolate(interpolated, func, opt);
    }
  }
  return template;
}

export function interpolate(template: string, funcOrData: Function | Object,
  mustPass?: boolean) {
  if (!template) {
    throw new Error(`can't interpolate ${template}`);
  }
  if (!funcOrData) {
    throw new Error(`interpolate function or data ${funcOrData}`);
  }
  const func = check(funcOrData, Function) ? funcOrData : ((key: string) => {
    return defaultLookup(key, funcOrData);
  });
  return _interpolate(template, func, { ref: funcOrData, mustPass: mustPass });
}