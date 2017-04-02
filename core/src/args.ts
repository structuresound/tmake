/// <reference path="args.d.ts" />

import { extend, clone, stringify } from 'typed-json-transform';

export const args: TMake.Args = <any>{}
export function init(runtime) {
    extend(args, runtime);
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