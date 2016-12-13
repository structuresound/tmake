import _ from 'lodash';
import path from 'path';
import {check, diff} from 'js-object-tools';
import fs from 'fs';

import {replaceAll, startsWith} from './util/string';
import log from './util/log';
import {exec} from './util/sh';
import interpolate from './interpolate';
import file from './util/file';
import args from './util/args';

function absolutePath(s) {
  if (!check(s, String)) {
    throw new Error(`${s} is not a string`);
  }
  if (startsWith(s, '/')) {
    return s;
  }
  return path.join(args.runDir, s);
}

function fullPath(p, root) {
  if (startsWith(p, '/')) {
    return p;
  }
  return path.join(root, p);
}

function pathArray(val, root) {
  return _.map(diff.arrayify(val), (v) => {
    return fullPath(v, root);
  });
}
const shellCache = {};
const shellReplace = (m) => {
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

function objectReplace(m, dict) {
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

function replace(m, conf) {
  let out;
  if (check(m, String)) {
    //  log.debug('sh..', out || m);
    out = shellReplace(m);
  } else if (check(m, Object)) {
    out = objectReplace(m, conf);
  }
  return out || m;
}

function allStrings(o, fn) {
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

function parseString(val, conf) {
  let mut = val;
  mut = interpolate(mut, conf);
  //  log.debug('interpolate..', mut);
  return replace(mut, conf);
}

function parseObject(obj, conf) {
  return allStrings(_.clone(obj), (val) => {
    return parseString(val, conf);
  });
}

function parse(input, conf) {
  //  log.debug('in:', input);
  let out;
  if (check(input, String)) {
    out = parseString(input, conf);
  } else if (check(input, Object)) {
    out = parseObject(input, conf || input);
  }
  //  log.debug('out:', out || input);
  return out || input;
}

function replaceInFile(f, r, localDict) {
  if (!fs.existsSync(f)) {
    throw new Error(`no file at ${f}`);
  }
  if (!r.inputs) {
    throw new Error(`repl entry has no inputs object or array, ${JSON.stringify(r, 0, 2)}`);
  }
  let stringFile = fs.readFileSync(f, 'utf8');
  for (const k of r.inputs) {
    const v = r.inputs(k);
    let parsedKey;
    let parsedVal;
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
      if (stringFile.includes(parsedKey)) {
        log.add(`[ replace ] ${parsedKey} : ${parsedVal}`);
      }
    }
    stringFile = replaceAll(stringFile, parsedKey, parsedVal);
  }
  const format = {
    ext: path.extname(f),
    name: path.basename(f, path.extname(f)),
    dir: path.dirname(f),
    base: path.basename(f)
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
