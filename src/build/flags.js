import '../util/string';
import _ from 'underscore';
import fs from '../util/fs';

const jsonToCFlags = function(object) {
  const opt = _.clone(object);
  if (opt.O) {
    switch (opt.O) {
      case 3: case "3": object.O3 = true; break;
      case 2: case "2": object.O2 = true; break;
      case 1: case "1": object.O1 = true; break;
      case 0: case "0": object.O0 = true; break;
      case "s": object.Os = true; break;
    }
    delete opt.O;
  }
  if (object.O3) {
    delete opt.O2;
  }
  if (opt.O3 || opt.O2) {
    delete opt.O1;
  }
  if (opt.O3 || opt.O2 || opt.O1) {
    delete object.Os;
  }
  if (opt.O3 || opt.O2 || opt.O1 || opt.Os) {
    delete opt.O0;
  }
  return jsonToFlags(opt);
};

const jsonToFrameworks = function(object) {
  const flags = [];
  for (const i in object) {
    if (object[i]) {
      if (fs.existsSync(`/System/Library/Frameworks/${i}.framework`)) {
        flags.push(`/System/Library/Frameworks/${i}.framework/${i}`);
      } else { throw new Error(`can't find framework ${i}.framework in /System/Library/Frameworks`); }
    }
  }
  return flags;
};

const isNumeric = n => !isNaN(parseFloat(n)) && isFinite(n);

const _jsonToFlags = function(object, options) {
  const flags = [];
  _.each(object, function(opt, key) {
    if (opt) {
      if ((typeof opt === 'string') || isNumeric(opt)) {
        const { join } = options;
        if (typeof opt === 'string') {
          if (opt.startsWith(" ")) { join = ""; }
          if (opt.startsWith("=")) { join = ""; }
        }
        if (key.startsWith(options.prefix)) { return flags.push(`${key}${join}${opt}`);
        } else { return flags.push(`${options.prefix}${key}${join}${opt}`); }
      } else {
        if (key.startsWith(options.prefix)) { return flags.push(`${key}`);
        } else { return flags.push(`${options.prefix}${key}`); }
      }
    }
  });
  return flags;
};

var jsonToFlags = function(object, options) {
  const defaultOptions = {
    prefix: '-',
    join: '='
  };
  if (options) {
    _.extend(defaultOptions, options);
  }
  return _jsonToFlags(object, defaultOptions);
};

export { jsonToFlags as parse, jsonToCFlags as parseC, jsonToFrameworks as parseFrameworks };
