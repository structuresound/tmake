import _ from 'underscore';
import check from './util/check';
import {valueForKeyPath} from './util/cascade';

function defaultLookup(key, data) {
  if (key in data) {
    return data[key];
  }
  // look up the chain
  const keyParts = key.split('.');
  if (keyParts.length > 1) {
    return valueForKeyPath(key, data);
  }
}

function _interpolate(template, func) {
  const commands = template.match(/{[^}\r\n]*}/g);
  if (commands) {
    if (commands[0].length === template.length) { // allow for object replacement of single command
      const res = func(commands[0].slice(1, -1));
      if (check(res, String)) {
        return _interpolate(res, func);
      }
      return res || template;
    }
    let interpolated = _.clone(template);
    let modified = false;
    for (const k of commands) {
      const c = commands[k];
      const lookup = func(c.slice(1, -1));
      if (lookup) {
        modified = true;
        interpolated = interpolated.replace(c, lookup);
      }
    }
    if (modified) {
      return _interpolate(interpolated, func);
    }
  }
  return template;
}

function interpolate(template, funcOrData, opts) {
  if (!template) {
    throw new Error('interpolate undefined');
  }
  if (check(template, String)) {
    let func = _.clone(funcOrData);
    if (funcOrData) {
      if (!check(funcOrData, Function)) {
        func = (key) => {
          return defaultLookup(key, funcOrData);
        };
      }
    } else {
      throw new Error('need to provide dictionary or key function to interpolate');
    }
    return _interpolate(template, func, opts);
  }
  return template;
}

export default interpolate;
