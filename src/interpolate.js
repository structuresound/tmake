import _ from 'lodash';
import {diff, check} from 'js-object-tools';

function defaultLookup(key, data) {
  if (key in data) {
    return data[key];
  }
  // look up the chain
  const keyParts = key.split('.');
  if (keyParts.length > 1) {
    return diff.valueForKeyPath(key, data);
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
    for (const c of commands) {
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
  if (!template || !funcOrData) {
    throw new Error('interpolate undefined or without function or data blob');
  }
  if (check(template, String)) {
    const func = check(funcOrData, Function)
      ? funcOrData
      : (key) => {
        return defaultLookup(key, funcOrData);
      };
    return _interpolate(template, func, opts);
  }
  return template;
}

export default interpolate;
