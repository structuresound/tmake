/*  eslint object-shorthand: "off"*/

import _ from 'lodash';
import Promise from 'bluebird';
import {check} from 'js-object-tools';

function iterate(confObject, fn, ignore) {
  let mutableConf = _.clone(confObject);
  if (check(mutableConf, String)) {
    mutableConf = [mutableConf];
  }
  const validCommands = [];
  for (const k of mutableConf) {
    let key = k;
    if (check(k, Number)) {
      key = 'shell';
    } else if (!_.contains(ignore, key)) {
      validCommands.push({obj: mutableConf[key], key: key});
    }
  }
  return Promise.each(validCommands, (i) => {
    if (fn(i.key)) {
      return fn(i.key, i.obj);
    }
    return fn('any', i.obj);
  });
}

export default iterate;
