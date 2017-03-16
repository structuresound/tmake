import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import { contains, check, safeOLHM, OLHM } from 'js-object-tools';

import { errors } from './errors';

import { Plugin } from './plugin';

export interface CmdObj {
  cmd: string;
  arg?: any;
  cwd?: string;
}

export function iterable(val: any) {
  if (check(val, Array)) {
    return val;
  } else if (check(val, Object)) {
    return _.map(val, (v) => { return v; });
  }
  return [val];
}

export function getCommands(it: any, ignore?: string[]) {
  const validCommands = [];
  if (check(it, String)) {
    if (Plugin.lookup(it)) {
      validCommands.push({ cmd: it });
    } else {
      throw new Error(`plugin ${it} not loaded`);
    }
  } else if (check(it, Array)) {
    for (const statement of it) {
      if (Plugin.lookup(statement)) {
        validCommands.push({ cmd: statement });
      } else {
        throw new Error(`plugin ${statement} not loaded`);
      }
    }
  } else if (check(it, Object)) {
    for (const k of Object.keys(it)) {
      if (Plugin.lookup(k)) {
        validCommands.push({ arg: it[k], cmd: k });
      }
    }
  }
  return validCommands;
}

export function iterateOLHM(obj: any, fn: (any: any) => PromiseLike<any>) {
  const it = safeOLHM(obj);
  if (!check(it, Array)
  ) {
    throw new Error('safeOLHM did not produce array');
  }
  return Bluebird.each(it, fn);
}

export function mapOLHM<T>(obj: OLHM<T>, fn: (object: any) => PromiseLike<T>): PromiseLike<T[]> {
  const it = safeOLHM(obj);
  if (!check(it, Array)
  ) {
    return Promise.reject(new Error('safeOLHM did not produce array'));
  }
  return Bluebird.map(it, fn);
}

export function iterate(obj: any, fn: (cmd: CmdObj) => Promise<any> | Bluebird<any>) {
  const it = iterable(obj);
  if (!check(it, Array)
  ) {
    throw new Error('iterable did not produce array');
  }
  return Bluebird.each(it, (i: CmdObj) => {
    return fn(i).catch((error: Error) => {
      return Promise.reject(errors.build.command.failed(i.cmd, error));
    });
  });
}
