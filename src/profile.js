import os from 'os';
import _ from 'lodash';
import path from 'path';
import Promise from 'bluebird';
import {check, diff} from 'js-object-tools';
import {replaceAll, startsWith} from './util/string';
import log from './util/log';
import cascade from './util/cascade';
import sh from './util/sh';
import interpolate from './interpolate';
import fs from './util/fs';
import argv from './util/argv';

const defaultCompiler = {
  mac: 'clang',
  linux: 'gcc',
  win: 'msvc'
};

const platformNames = {
  linux: 'linux',
  darwin: 'mac',
  mac: 'mac',
  win: 'win',
  win32: 'win',
  ios: 'ios',
  android: 'android'
};

const archNames = {
  x64: 'x86_64',
  arm: 'armv7a',
  arm64: 'arm64'
};

const HOST_ENDIANNESS = os.endianness();
const HOST_PLATFORM = platformNames[os.platform()];
const HOST_ARCHITECTURE = archNames[os.arch()];
const HOST_CPU = os.cpus();

const HOST_ENV = {
  architecture: HOST_ARCHITECTURE,
  endianness: HOST_ENDIANNESS,
  compiler: defaultCompiler[HOST_PLATFORM],
  platform: HOST_PLATFORM,
  cpu: {
    num: HOST_CPU.length,
    speed: HOST_CPU[0].speed
  }
};

const DEFAULT_TARGET_ENV = {
  architecture: HOST_ARCHITECTURE,
  endianness: HOST_ENDIANNESS,
  platform: HOST_PLATFORM
};

function parseSelectors(dict, base) {
  const _selectors = [];
  const selectables = _.pick(dict, ['platform', 'compiler']);
  for (const key of Object.keys(selectables)) {
    _selectors.push(`${base}-${selectables[key]}`);
  }
  return _selectors;
}

const macros = fs.parseFileSync(path.join(argv.binDir, 'environment.yaml'));
const _keywords = fs.parseFileSync(path.join(argv.binDir, 'keywords.yaml'));
const keywords = [].concat(_.map(_keywords.host, (key) => {
  return `host-${key}`;
})).concat(_.map(_keywords.target, (key) => {
  return `target-${key}`;
}))
  .concat(_keywords.build)
  .concat(_keywords.compiler)
  .concat(_keywords.sdk)
  .concat(_keywords.ide)
  .concat(_keywords.deploy);

const argvSelectors = Object.keys(_.pick(argv, keywords));
argvSelectors.push(argv.compiler);

const cache = {};
const shellReplace = (m) => {
  if (cache[m] !== undefined) {
    //  log.debug('cached..', m, '->', cache[m]);
    return cache[m];
  }
  const commands = m.match(/\$\([^)\r\n]*\)/g);
  if (commands) {
    let interpolated = m;
    _.each(commands, (c) => {
      const cmd = c.slice(2, -1);
      //  log.debug('command..', cmd);
      interpolated = interpolated.replace(c, sh.get(cmd, false));
    });
    //  log.debug('cache..', interpolated, '-> cache');
    cache[m] = interpolated;
    return cache[m];
  }
  return m;
};

function objectReplace(m, dict) {
  if (!m.macro) {
    throw new Error(`object must have macro key and optional map ${JSON.stringify(m)}`);
  }
  const res = parse(m.macro, dict);
  if (m.map) {
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
    //  log.debug('map..', out || m);
    out = objectReplace(m, conf);
  }
  return out || m;
}

function allStrings(o, fn) {
  const mut = _.clone(o);
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

function parseObject(conf) {
  return allStrings(_.clone(conf), val => {
    return parseString(val, conf);
  });
}

function parse(input, conf) {
  //  log.debug('in:', input);
  let out;
  if (check(input, String)) {
    out = parseString(input, conf);
  } else if (check(input, Object)) {
    out = parseObject(input);
  }
  //  log.debug('out:', out || input);
  return out || input;
}

class Profile {
  constructor(conf) {
    const mutable = diff.clone(conf);
    if (!mutable || !mutable.profile) {
      mutable.profile = {
        host: HOST_ENV,
        target: DEFAULT_TARGET_ENV
      };
    } else {
      mutable.profile = {
        host: diff.combine(HOST_ENV, conf.profile.host),
        target: diff.combine(DEFAULT_TARGET_ENV, conf.profile.target)
      };
    }
    const hostSelectors = parseSelectors(mutable.profile.host, 'host');
    const targetSelectors = parseSelectors(mutable.profile.target, 'target');
    this.selectors = hostSelectors.concat(targetSelectors);
    this.macro = cascade.deep(macros, keywords, this.selectors);

    const localConf = diff.combine(mutable, this.macro);
    this.conf = cascade.deep(localConf, keywords, this.selectors);
    this.profile = this.conf.profile;
  }
  parse(input, conf) {
    return parse(input, conf || this.conf, this.macro);
  }
  select(base, options) {
    if (!base) {
      throw new Error('selecting on empty object');
    }
    const mutableOptions = diff.clone(options || {});
    if (mutableOptions.ignore) {
      mutableOptions.keywords = _.difference(keywords, options.ignore);
      mutableOptions.selectors = _.difference(this.selectors, options.ignore);
    }
    const flattened = cascade.deep(base, mutableOptions.keywords || keywords, mutableOptions.selectors || this.selectors);
    return this.parse(flattened, mutableOptions.dict);
  }
  force() {
    return argv.forceAll || (argv.force && (argv.force === this.rawConfig.name));
  }
  j() {
    return this.profile.host.cpu.num;
  }
}

function arrayify(val) {
  if (check(val, Array)) {
    return val;
  }
  return [val];
}

function fullPath(p, dep) {
  if (startsWith(p, '/')) {
    return p;
  }
  return path.join(dep.d.root, p);
}

function pathArray(val) {
  _.map(arrayify(val), (v) => {
    return pathSetting(v);
  });
}

function pathSetting(val) {
  fullPath(parse(val));
}

function globArray(val) {
  _.map(arrayify(val), (v) => {
    return parse(v);
  });
}

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

function iterate(confObject, fn, ignore) {
  let mutableConf = _.clone(confObject);
  if (check(mutableConf, String)) {
    mutableConf = [mutableConf];
  }
  const validCommands = [];
  for (const k of mutableConf) {
    let key = k;
    const val = mutableConf[key];
    if (check(k, Number)) {
      key = 'shell';
    } else if (!_.contains(ignore, key)) {
      validCommands.push({obj: val, key: key});
    }
  }
  return Promise.each(validCommands, (i) => {
    if (fn(i.key)) {
      return fn(i.key, i.obj);
    }
    return fn('any', i.obj);
  });
}

function printRepl(r, localDict) {
  let string = '\n';
  for (const k of r.inputs) {
    const val = r.inputs(k);
    let key = k;
    if (r.directive) {
      key = `${r.directive.prepost || r.directive.pre || ''}${k}${r.directive.prepost || r.directive.post || ''}`;
    }
    string += `${key} : ${parse(val, localDict)}\n`;
  }
  return string;
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
    if (argv.verbose) {
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
    return fs.writeFileAsync(newPath, stringFile, {encoding: 'utf8'});
  }
}

export {
  Profile,
  pathArray,
  globArray,
  pathSetting,
  arrayify,
  replaceInFile,
  interpolate,
  iterable,
  iterate,
  cache,
  printRepl,
  replaceAll,
  replace,
  keywords
};
