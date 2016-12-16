import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import {check, diff} from 'js-object-tools';

import {replaceAll, startsWith} from './util/string';
import log from './util/log';
import {exec} from './util/sh';
import interpolate from './interpolate';
import * as file from './util/file';
import args from './util/args';

function absolutePath(s: string) {
  if (!check(s, String)) {
    throw new Error(`${s} is not a string`);
  }
  if (startsWith(s, '/')) {
    return s;
  }
  return path.join(args.runDir, s);
}

function fullPath(p: string, root: string) {
  if (startsWith(p, '/')) {
    return p;
  }
  return path.join(root, p);
}

function pathArray(val: string | string[], root: string): string[] {
  return _.map(diff.arrayify(val), (v) => {
    return fullPath(v, root);
  });
}

const shellCache: {[index: string]: string} = {};
const shellReplace = (m: string) => {
  if (shellCache[m] !== undefined) {
    //  log.debug('cached..', m, '->', cache[m]);
    return shellCache[m];
  }
  const commands = m.match(/\$\([^)\r\n]*\)/g);
  if (commands) {
    let interpolated = m;
    for (const c of commands) {
      const cmd = c.slice(2, -1);
      //  log.debug('command..', cmd);
      interpolated = interpolated.replace(c, exec(cmd, {silent: true}));
    }
    //  log.debug('cache..', interpolated, '-> cache');
    shellCache[m] = interpolated;
    return shellCache[m];
  }
  return m;
};

function objectReplace(m: {macro: string, map: {[index: string]: string}}, dict: Object) {
  if (!m.macro) {
    throw new Error(`object must have macro key and optional map ${JSON.stringify(m)}`);
  }
  const res = parse(m.macro, dict);
  if (m.map) {
    if (!m.map[res]) {
      throw new Error(`object mapper must have case for ${res}`);
    }
    return m.map[res];
  }
  return res;
}

function replace(m: any, conf?: Object) {
  let out: string;
  if (check(m, String)) {
    //  log.debug('sh..', out || m);
    out = shellReplace(m);
  } else if (check(m, Object)) {
    out = objectReplace(m, conf);
  }
  return out || m;
}

function allStrings(o: {[index: string]: any}, fn: Function) {
  const mut = o;
  for (const k of Object.keys(mut)) {
    if (check(mut[k], String)) {
      mut[k] = fn(mut[k]);
    } else if (check(mut[k], Object) || check(mut[k], Array)) {
      allStrings(mut[k], fn);
    }
  }
  return mut;
}

function parseString(val: string, conf: Object) {
  let mut = val;
  mut = interpolate(mut, conf, undefined);
  //  log.debug('interpolate..', mut);
  return replace(mut, conf);
}

function parseObject(obj: Object, conf: Object) {
  return allStrings(_.clone(obj), (val: string) => {
    return parseString(val, conf);
  });
}

function parse(input: any, conf: Object) {
  //  log.debug('in:', input);
  let out: any;
  if (check(input, String)) {
    out = parseString(input, conf);
  } else if (check(input, Object)) {
    out = parseObject(input, conf || input);
  }
  //  log.debug('out:', out || input);
  return out || input;
}

function replaceInFile(f: string, r: any, localDict?: Object) {
  if (!fs.existsSync(f)) {
    throw new Error(`no file at ${f}`);
  }
  if (!r.inputs) {
    throw new Error(`repl entry has no inputs object or array, ${JSON.stringify(r, [], 2)}`);
  }
  let stringFile = fs.readFileSync(f, 'utf8');
  for (const k of r.inputs) {
    const v = r.inputs(k);
    let parsedKey: string;
    let parsedVal: string;
    if (Array.isArray(v)) {
      parsedKey = v[0];
      parsedVal = v[1];
    } else {
      parsedKey = parse(k, localDict);
      parsedVal = parse(v, localDict);
    }
    if (r.directive) {
      parsedKey = `${r.directive.prepost || r.directive.pre || ''}${parsedKey}${r.directive.prepost || r.directive.post || ''}`;
    }
    if (args.verbose) {
      if ((<any>stringFile).includes(parsedKey)) { // https://github.com/Microsoft/TypeScript/issues/3920
        log.add(`[ replace ] ${parsedKey} : ${parsedVal}`);
      }
    }
    stringFile = replaceAll(stringFile, parsedKey, parsedVal);
  }
  const format: path.ParsedPath = {
    ext: path.extname(f),
    name: path.basename(f, path.extname(f)),
    dir: path.dirname(f),
    base: path.basename(f),
    root: ''
  };
  if (format.ext === '.in') {
    const parts = f.split('.');
    format.dir = path.dirname(parts[0]);
    format.name = path.basename(parts[0]);
    format.ext = parts
      .slice(1)
      .join('.');
  }
  const editedFormat = _.extend(format, _.pick(r, Object.keys(format)));
  editedFormat.base = `${format.name}.${format.ext}`;
  const newPath = path.format(editedFormat);
  let existingString = '';
  if (fs.existsSync(newPath)) {
    existingString = fs.readFileSync(newPath, 'utf8');
  }
  if (existingString !== stringFile) {
    // console.log 'replaced some strings in', newPath
    return file.writeFileAsync(newPath, stringFile, {encoding: 'utf8'});
  }
}

export {parse, absolutePath, pathArray, fullPath, replaceInFile};