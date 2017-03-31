import * as _ from 'lodash';
import { valueForKeyPath, check } from 'typed-json-transform';

import { log } from './log';
import { replaceAll } from './string';

function defaultLookup(key: string, data: { [index: string]: any }) {
  const res = valueForKeyPath(key, data);
  return valueForKeyPath(key, data);
}

export interface InterpolateOptions {
  [index: string]: any;
  ref?: { [index: string]: any }
  mustPass?: boolean
}

function _interpolate<T>(template: T, func: Function | Object,
  opt: InterpolateOptions): T {
  let str: string = <any>template;
  const matches = str.match(/\$\{[^}\r\n]*\}/g);
  if (!matches) {
    return template;
  }
  if (matches[0].length === str.length) {  // allow for object replacement of single command
    const res = (<Function>func)(matches[0].slice(2, -1));
    if (check(res, String)) {
      return _interpolate(res, func, opt);
    }
    return res || str;
  }
  let modified = false;
  // console.log('<=', str);
  for (const c of matches) {
    // console.log('? ', c);
    const lookup = (<Function>func)(c.slice(2, -1));
    if (lookup) {
      // console.log('= ', lookup);
      modified = true;
      str = replaceAll(str, c, lookup);
    } else if (opt.mustPass) {
      throw new Error(`no value for required keypath ${c} in interpolation stack ${log.parse(opt.ref)}`);
    }
  }
  if (modified) {
    // console.log('..', str);
    return _interpolate(<T><any>str, func, opt);
  }
  // console.log('=>', str);
  return <T><any>str;
}

export function interpolate<T>(template: T, funcOrData: Function | Object,
  mustPass?: boolean): T {
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