import _ from 'lodash';
import {diff, check} from 'js-object-tools';
import Promise from 'bluebird';

function iterable(val) {
  if (check(val, Array)) {
    return val;
  } else if (check(val, Object)) {
    return _.map(val, (v) => {
      return v;
    });
  }
  return [val];
}

function getCommands(it, ignore) {
  const validCommands = [];
  if (check(it, String)) {
    validCommands.push({arg: it, cmd: 'shell'});
  } else if (check(it, Array)) {
    for (const statement of it) {
      validCommands.push({arg: statement, cmd: 'shell'});
    }
  } else if (check(it, Object)) {
    for (const k of Object.keys(it)) {
      if (!diff.contains(ignore, k)) {
        validCommands.push({arg: it[k], cmd: k});
      }
    }
  }
  return validCommands;
}

function iterate(obj, fn) {
  const it = iterable(obj);
  return Promise.each(it, fn);
}

export {iterable, iterate, getCommands};
