import * as _ from 'lodash';
import * as Promise from 'bluebird';
import { contains, check, safeOLHM } from 'js-object-tools';

const _ignore = [
  'linkerFlags',
  'cFlags',
  'cxxFlags',
  'compilerFlags',
  'defines',
  'frameworks',
  'sources',
  'headers',
  'libs',
  'includeDirs',
  'outputFile'
];

function iterable(val: any) {
  if (check(val, Array)) {
    return val;
  } else if (check(val, Object)) {
    return _.map(val, (v) => { return v; });
  }
  return [val];
}

function getCommands(it: any, ignore?: string[]) {
  const validCommands = [];
  if (check(it, String)) {
    validCommands.push({ arg: it, cmd: 'shell' });
  } else if (check(it, Array)) {
    for (const statement of it) {
      validCommands.push({ arg: statement, cmd: 'shell' });
    }
  } else if (check(it, Object)) {
    for (const k of Object.keys(it)) {
      if (!contains(ignore || _ignore, k)) {
        validCommands.push({ arg: it[k], cmd: k });
      }
    }
  }
  return validCommands;
}

function iterateOLHM(obj: any, fn: (any: any) => Promise<any>) {
  const it = safeOLHM(obj);
  if (!check(it, Array)
  ) {
    throw new Error('safeOLHM did not produce array');
  }
  return Promise.each(it, fn);
}

function mapOLHM(obj: any, fn: (any: any) => Promise<any>) {
  const it = safeOLHM(obj);
  if (!check(it, Array)
  ) {
    throw new Error('safeOLHM did not produce array');
  }
  return Promise.map(it, fn);
}

function iterate(obj: any, fn: (cmd: schema.CmdObj) => Promise<any>) {
  const it = iterable(obj);
  if (!check(it, Array)
  ) {
    throw new Error('iterable did not produce array');
  }
  return Promise.each(it, fn);
}

export { iterable, iterate, iterateOLHM, mapOLHM, getCommands };
