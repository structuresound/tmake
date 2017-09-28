import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import { check, arrayify, clone, valueForKeyPath } from 'typed-json-transform';

import { replaceAll, startsWith } from './string';
import { log } from './log';
import { exec } from './shell';
import * as file from './file';
import { args } from './runtime';
import { endsWith } from './string';

import { interpolate } from './interpolate';

interface MacroObject {
  macro: string, map: { [index: string]: string }
}

interface ReplEntry {
  inputs: any
  matching: any
  directive: {
    prepost?: string, pre?: string, post?: string
  }
  ext: string
}

function absolutePath(s: string, relative?: string) {
  if (!check(s, String)) {
    throw new Error(`${s} is not a string`);
  }
  if (startsWith(s, '/')) {
    return s;
  }
  const dir: string = relative || args.runDir;
  return path.join(dir, s);
}

function resolvePath(p: string, root: string) {
  if (startsWith(p, '/')) {
    return p;
  }
  return path.join(root, p);
}

function pathArray(val: string | string[], root: string): string[] {
  return _.map(arrayify(val), (v) => { return resolvePath(v, root); });
}

const shellCache: { [index: string]: string } = {};

const shellReplace = (m: string) => {
  if (shellCache[m] !== undefined) {
    // log.log('cached..', m, '->', shellCache[m]);
    return shellCache[m];
  }
  const commands = m.match(/\$\([^)\r\n]*\)/g);
  if (commands) {
    // console.log('shell replace', commands, 'in', m);
    let interpolated = m;
    for (const c of commands) {
      const cmd = c.slice(2, -1);
      // log.log('command..', cmd);
      interpolated = interpolated.replace(c, exec(cmd, { silent: true }));
    }
    // log.log('cache..', interpolated, '-> cache');
    shellCache[m] = interpolated;
    return shellCache[m];
  }
  return m;
}

function objectReplace(m: MacroObject, dict: Object) {
  if (!m.macro) {
    throw new Error(`object must have macro key and optional map ${JSON.stringify(m)}`);
  }
  const res = interpolate(m.macro, dict);
  // console.log('object repl =>', res)
  if (m.map) {
    if (!m.map[res]) {
      throw new Error(`object mapper must have case for ${res}`);
    }
    return m.map[res];
  }
  return res;
}

function replace<T>(m: T, conf?: Object) {
  if (check(m, String)) {
    return shellReplace(<string><any>m);
  } else if (check(m, Object)) {
    return objectReplace(<MacroObject><any>m, conf);
  }
  return m;
}

function insertBeforeExtension(val: string, prefix: string) {
  return val.replace(/\.([^.]+)$/, `${prefix}.$1`);
}

function rewriteExtension(f: string, ext: string) {
  if (ext) {
    var i = f.lastIndexOf('.');
    if (i != -1) {
      return f.substr(0, i) + '.' + ext;
    }
    return f + '.' + ext;
  }
  return f;
}

function readWritePathsForFile(f: string, r: ReplEntry) {
  if (endsWith(f, '.in')) {
    return {
      readPath: f,
      cachePath: undefined,
      writePath: rewriteExtension(f.replace(new RegExp('.in' + '$'), ''), r.ext)
    }
  }
  return {
    readPath: f,
    cachePath: f + '.tmake',
    writePath: rewriteExtension(f, r.ext)
  }
}

function backupIfNeeded({ readPath, cachePath, writePath }) {
  if (cachePath && writePath === readPath && !fs.existsSync(cachePath)) {
    // log.warn('cache input file to', cachePath);
    try {
      fs.renameSync(readPath, cachePath);
      log.verbose(`moving original file to ${cachePath}`);
    } catch (e) {
      throw new Error(`but no original source file located at ${readPath}`);
    }
  }
}

function sourceString({ readPath, cachePath }) {
  try {
    return fs.readFileSync(cachePath, 'utf8');
  } catch (e) {
    try {
      return fs.readFileSync(readPath, 'utf8');
    }
    catch (e) {
      throw new Error(`no input file at ${readPath}`);
    }
  }
}

function replaceInFile(f: string, r: ReplEntry, environment?: Object) {
  const { readPath, cachePath, writePath } = readWritePathsForFile(f, r);
  let inputString = sourceString({ readPath, cachePath });
  if (!r.inputs) {
    throw new Error(`repl entry has no inputs object or array, ${JSON.stringify(r, [], 2)}`);
  }
  for (const k of Object.keys(r.inputs)) {
    const v = r.inputs[k];
    let parsedKey: string;
    let parsedVal: string;
    if (check(v, Array)) {
      parsedKey = v[0];
      parsedVal = v[1];
    } else {
      parsedKey = interpolate(k, environment);
      parsedVal = interpolate(v, environment);
    }
    if (r.directive) {
      parsedKey = `${r.directive.prepost || r.directive.pre || ''}${parsedKey}${r.directive.prepost || r.directive.post || ''}`;
    }
    if (args.verbose) {
      if ((<any>inputString)
        .includes(
        parsedKey)) {  // https://github.com/Microsoft/TypeScript/issues/3920
        log.add(`[ replace ] ${parsedKey} : ${parsedVal}`);
      }
    }
    inputString = replaceAll(inputString, parsedKey, parsedVal);
  }

  let existingString;
  try {
    existingString = fs.readFileSync(writePath, 'utf8');
  } catch (e) {
    existingString = '';
  }

  if (existingString !== inputString) {
    backupIfNeeded({ readPath, cachePath, writePath });
    return file.writeFileAsync(writePath, inputString, { encoding: 'utf8' });
  }
  return Bluebird.resolve();
}

export { MacroObject, ReplEntry, absolutePath, pathArray, resolvePath, replaceInFile };