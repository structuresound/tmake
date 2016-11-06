import _ from 'underscore';
import '../util/string';
import fs from '../util/fs';
import {check} from '1e1f-tools';

function jsonToCFlags(object) {
  const opt = _.clone(object);
  if (opt.O) {
    switch (opt.O) {
      case 3:
      case '3':
        opt.O3 = true;
        break;
      case 2:
      case '2':
        opt.O2 = true;
        break;
      case 1:
      case '1':
        opt.O1 = true;
        break;
      case 0:
      case '0':
        opt.O0 = true;
        break;
      case 's':
        opt.Os = true;
        break;
      default: break;
    }
    delete opt.O;
  }
  if (opt.O3) {
    delete opt.O2;
  }
  if (opt.O3 || opt.O2) {
    delete opt.O1;
  }
  if (opt.O3 || opt.O2 || opt.O1) {
    delete opt.Os;
  }
  if (opt.O3 || opt.O2 || opt.O1 || opt.Os) {
    delete opt.O0;
  }
  return jsonToFlags(opt);
}

function jsonToFrameworks(object) {
  const flags = [];
  for (const key of Object.keys(object)) {
    if (object[key]) {
      if (fs.existsSync(`/System/Library/Frameworks/${key}.framework`)) {
        flags.push(`/System/Library/Frameworks/${key}.framework/${key}`);
      } else {
        throw new Error(`can't find framework ${key}.framework in /System/Library/Frameworks`);
      }
    }
  }
  return flags;
}

function _jsonToFlags(object, options) {
  const flags = [];
  _.each(object, (opt, key) => {
    if (opt) {
      if ((typeof opt === 'string') || check(opt, Number)) {
        let {join} = options;
        if (typeof opt === 'string') {
          if (opt.startsWith(' ')) {
            join = '';
          }
          if (opt.startsWith('=')) {
            join = '';
          }
        }
        if (key.startsWith(options.prefix)) {
          return flags.push(`${key}${join}${opt}`);
        }
        return flags.push(`${options.prefix}${key}${join}${opt}`);
      }
      if (key.startsWith(options.prefix)) {
        return flags.push(`${key}`);
      }
      return flags.push(`${options.prefix}${key}`);
    }
  });
  return flags;
}

function jsonToFlags(object, options) {
  const defaultOptions = {
    prefix: '-',
    join: '='
  };
  if (options) {
    _.extend(defaultOptions, options);
  }
  return _jsonToFlags(object, defaultOptions);
}

export {jsonToFlags as parse, jsonToCFlags as parseC, jsonToFrameworks as parseFrameworks};
