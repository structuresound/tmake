/*  eslint no-console: ["off"] */

import yaml from 'js-yaml';
import colors from 'chalk';
import _ from 'lodash';

import {check} from 'js-object-tools';
import argv from './argv';

const debug = true;

function getMessage(msg, ...args) {
  if (check(msg, Object)) {
    return [
      yaml.dump(msg, {sortKeys: true}),
      ...args
    ];
  } else if (check(msg, Array)) {
    return [
      JSON.stringify(msg, 0, 2),
      ...args
    ];
  }
  return [
    msg, ...args
  ];
}

export default {
  verbose(...args) {
    if (argv.verbose) {
      console.log(colors.gray(...getMessage(...args)));
    }
  },
  quiet(...args) {
    if (!argv.quiet || argv.verbose) {
      console.log(colors.white(...getMessage(...args)));
    }
  },
  debug(...args) {
    if (argv.debug || debug) {
      console.log(...getMessage(...args));
    }
  },
  log(...args) {
    console.log(...getMessage(...args));
  },
  info(...args) {
    console.log(colors.blue(...getMessage(...args)));
  },
  warn(...args) {
    console.log(colors.yellow(...getMessage(...args)));
  },
  add(...args) {
    if (argv.add || argv.verbose) {
      console.log(colors.green(...getMessage(...args)));
    }
  },
  error(...args) {
    return console.log(colors.red(...getMessage(...args)));
  },
  throw(...args) {
    console.log(colors.magenta(...getMessage(...args)));
    throw new Error('log wants you to stop and look at the magenta message');
  }
};
