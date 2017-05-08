/// <reference path="args.d.ts" />

import { extend, clone, stringify } from 'typed-json-transform';
import { init as initDb } from './db';

let lock = false;
export const args: TMake.Args = <any>{}

export function init(runtime) {
  if (!lock) {
    lock = true;
    extend(args, runtime);
    initDb();
    console.log('did init args + db');
  } else {
    throw new Error("second call to init(), something must be wrong");
  }
}

export function encode() {
  const cp = clone(args);
  delete cp._;
  return new Buffer(stringify(cp)).toString('base64');
}

export function decode(str) {
  const decoded = new Buffer(str, 'base64').toString('ascii');
  const json = JSON.parse(decoded);
  delete json._;
  return json;
}