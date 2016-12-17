import * as _ from 'lodash';
import {diff, check} from 'js-object-tools';

import log from './util/log';

function defaultLookup(key: string, data: {[index: string]: any}) {
  if (key in data) {
    return data[key];
  }
  // look up the chain
  const keyParts = key.split('.');
  if (keyParts.length > 1) {
    const repl = diff.valueForKeyPath(key, data);
    return repl;
  }
}

function _interpolate(template: string, func: Function | Object, data?: {[index: string]: any}): string {
  const commands = template.match(/{[^}\r\n]*}/g);
  if (commands) {
    if (commands[0].length ===
        template.length) {  // allow for object replacement of single command
      const res = (<Function>func)(commands[0].slice(1, -1));
      if (check(res, String)) {
        return _interpolate(res, func, data);
      }
      return res || template;
    }
    let interpolated = _.clone(template);
    let modified = false;
    for (const c of commands) {
      const lookup = (<Function>func)(c.slice(1, -1));
      if (lookup) {
        modified = true;
        interpolated = interpolated.replace(c, lookup);
      } else {
        throw new Error(
            `error in interpolation, no value for keypath ${c} in ${log.parse(data)}`);
      }
    }
    if (modified) {
      return _interpolate(interpolated, func, data);
    }
  }
  return template;
}

function interpolate(template: string, funcOrData: Function | Object) {
  if (!template){
    throw new Error(`can't interpolate ${template}`);
  }
  if (!funcOrData) {
    throw new Error(`interpolate function or data ${funcOrData}`);
  }
  if (check(template, String)) {
    const func = check(funcOrData, Function) ? funcOrData : (key: string) => {
      return defaultLookup(key, funcOrData);
  };
  return _interpolate(template, func, funcOrData);
}
return template;
}

export default interpolate;
