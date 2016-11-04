import _ from 'underscore';
import check from '../util/check';
import { valueForKeyPath } from './cascade';

const defaultLookup = function(key, data) {
  if (key in data) {
    return data[key];
  } else {
    // look up the chain
    const keyParts = key.split('.');
    if (keyParts.length > 1) {
      return valueForKeyPath(key, data);
    }
  }
};

const _interpolate = function(template, func) {
  const commands = template.match(/{[^}\r\n]*}/g);
  if (commands) {
    if (commands[0].length === template.length) { // allow for object replacement of single command
      const res = func(commands[0].slice(1, -1));
      if (check(res, String)) { return _interpolate(res, func);
      } else { return res || template; }
    } else {
      const interpolated = template;
      const modified = false;
      _.each(commands, function(c) {
        const lookup = func(c.slice(1, -1));
        if (lookup) {
          modified = true;
          return interpolated = interpolated.replace(c, lookup);
        }
      });
      if (modified) {
        return _interpolate(interpolated, func);
      } else {
        return template;
      }
    }
  } else { return template; }
};

const interpolate = function(template, funcOrData, opts) {
  if (!template) { throw new Error("interpolate undefined"); }
  if (check(template, String)) {
    const func = funcOrData;
    if (funcOrData) {
      if (!check(funcOrData, Function)) {
        func = key => defaultLookup(key, funcOrData);
      }
    } else {
      throw new Error("need to provide dictionary or key function to interpolate");
    }
    return _interpolate(template, func, opts);
  } else {
    return template;
  }
};

export default interpolate;
