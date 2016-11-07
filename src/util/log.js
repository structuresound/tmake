/*  eslint no-console: ["off"] */

import yaml from 'js-yaml';
import colors from 'chalk';
import _ from 'lodash';

import {check} from 'js-object-tools';
import argv from './argv';

function getMessage(msg) {
  if (check(msg, Object)) {
    return yaml.dump(msg, { sortKeys: true });
  } else if (check(msg, Array)) {
    return _
      .map(msg, getMessage)
      .join(',');
  }
  return msg;
}

export default {
  verbose(msg, color) {
    if (argv.verbose) {
      return console.log(colors[color || 'gray'](getMessage(msg)));
    }
  },
  quiet(msg, color) {
    if (!argv.quiet || argv.verbose) {
      return console.log(colors[color || 'white'](getMessage(msg)));
    }
  },
  info(msg, color) {
    console.log(colors[color || 'white'](getMessage(msg)));
  },
  warn(msg, color) {
    console.log(colors[color || 'yellow'](getMessage(msg)));
  },
  add(msg, color) {
    console.log(colors[color || 'green'](getMessage(msg)));
  },
  error(msg) {
    return console.log(colors.red(getMessage(msg)));
  },
  throw(msg) {
    console.log(colors.magenta(getMessage(msg)));
    throw new Error('log wants you to stop and look at the magenta message');
  }
};
