import os from 'os';
import _ from 'underscore';
import path from 'path';
import Promise from 'bluebird';
import {Map} from 'immutable';

import log from './util/log';
import cascade from './util/cascade';
import check from './util/check';
import sh from './util/sh';
import interpolate from './interpolate';
import fs from './util/fs';
import argv from './util/argv';

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

const kits = ['cocoa', 'sdl', 'juce'];

const environments = ['simulator'];

const ides = [
  // IDE's
  'xcode',
  'clion',
  'msvs',
  'vscode',
  'codeblocks',
  'appcode'
];

const buildSystems = ['cmake', 'ninja'];
const compilers = ['clang', 'gcc', 'msvc'];

const defaultPlatformCompiler = {
  mac: 'clang',
  ios: 'clang',
  linux: 'gcc',
  win: 'msvc'
};

const validArchitectures = Map({
  mac: ['x86_64'],
  ios: [
    'arm64', 'armv7s', 'armv7'
  ],
  simulator: ['x86_64']
});

const macros = {
  XC_RUN: 'xcrun --sdk {XC_PLATFORM}',
  'mac ios': {
    DEVELOPER: '$(xcode-select -print-path)'
  },
  mac: {
    XC_PLATFORM: 'macosx',
    PLATFORM: 'darwin64-x86_64-cc',
    OSX_DEPLOYMENT_VERSION: '10.8',
    SDK_VERSION: '$({XC_RUN} --show-sdk-version)',
    OSX_SDK_VERSION: '$({XC_RUN} --show-sdk-version)',
    OSX_PLATFORM: '$({XC_RUN} --show-sdk-platform-path)',
    OSX_SDK: '$({XC_RUN} --show-sdk-path)'
  },
  'mac linux': {
    ARCH: 'x86_64'
  },
  ios: {
    HOST_PLATFORM: 'mac',
    XC_PLATFORM: 'iphoneos',
    XC_DIR: 'iPhoneOS',
    ARCH: 'arm64',
    CROSS_TOP: '{DEVELOPER}/Platforms/{XC_DIR}.platform/Developer',
    CROSS_SDK: '{XC_DIR}{SDK_VERSION}.sdk',
    SDK_VERSION: '$({XC_RUN} --show-sdk-version)',
    IPHONEOS_SDK_VERSION: '$({XC_RUN} --show-sdk-version)',
    IPHONEOS_PLATFORM: '$({XC_RUN} --show-sdk-platform-path)',
    IPHONEOS_SDK: '$({XC_RUN} --show-sdk-path)',
    FRAMEWORKS: '{CROSS_TOP}/SDKs/{CROSS_SDK}/System/Library/Frameworks/',
    INCLUDES: '{CROSS_TOP}/SDKs/{CROSS_SDK}/usr/include',
    IPHONEOS_DEPLOYMENT_VERSION: '6.0',
    simulator: {
      XC_PLATFORM: 'iphonesimulator',
      XC_DIR: 'iPhoneSimulator',
      ARCH: 'x86_64'
    }
  }
};

const cache = {};
const macro = {};

function targetPlatform(rootConfig) {
  return argv.platform || rootConfig.platform || platformNames[os.platform()];
}

macros.OS_ENDIANNESS = os.endianness();
macros.HOST_PLATFORM = platformNames[os.platform()];
macros.HOST_ARCHITECTURE = archNames[os.arch()];
macros.TARGET_PLATFORM = targetPlatform();

const keywords = _
  .uniq(Object.keys(platformNames))
  .concat(validArchitectures[targetPlatform()])
  .concat(buildSystems)
  .concat(compilers)
  .concat(kits)
  .concat(ides)
  .concat(environments);

const argvSelectors = Object.keys(_.pick(argv, keywords));
if (argv.compiler == null) {
  argv.compiler = defaultPlatformCompiler[targetPlatform()];
}
argvSelectors.push(argv.compiler);

const selectors = [targetPlatform()].concat(argvSelectors);

const shellReplace = (m) => {
  if (cache[m]) {
    return cache[m];
  }
  const commands = m.match(/\$\([^\)\r\n]*\)/g);
  if (commands) {
    let interpolated = m;
    _.each(commands, (c) => {
      interpolated = interpolated.replace(c, sh.get(c.slice(2, -1)));
    });
    cache[m] = interpolated;
    return cache[m];
  }
  return m;
};

function objectReplace(m, dict) {
  if (!m.macro) {
    throw new Error(`object must have macro key and optional map ${JSON.stringify(m)}`);
  }
  const res = _parse(m.macro, dict);
  if (m.map) {
    return m.map[res];
  }
  return res;
}

function replace(m, dict) {
  if (check(m, String)) {
    return shellReplace(m);
  } else if (check(m, Object)) {
    return objectReplace(m, dict);
  }
  return m;
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

function _parse(_val, dict) {
  let mut = _.clone(_val);
  if (dict) {
    mut = interpolate(mut, dict);
  }
  mut = interpolate(mut, macro);
  return replace(mut, dict);
}

function parse(conf, dict) {
  if (check(conf, String)) {
    return _parse(conf, dict);
  } else if (check(conf, Object)) {
    if (conf.macro) {
      // log.verbose 'parsing macro object, #{JSON.stringify conf}'
      return objectReplace(conf, dict || {});
    }
    return allStrings(_.clone(conf || conf), val => {
      return parse(val, dict || conf);
    });
  }
  return conf;
}

_.extend(macro, cascade.deep(macros, keywords, [targetPlatform()]));

function select(base, options) {
  if (!base) {
    throw new Error('selecting on empty object');
  }
  const mutableOptions = _.clone(options || {});
  if (mutableOptions.ignore) {
    mutableOptions.keywords = _.difference(keywords, options.ignore);
    mutableOptions.selectors = _.difference(selectors, options.ignore);
  }
  const flattened = cascade.deep(_.clone(base), mutableOptions.keywords, mutableOptions.selectors);
  return parse(flattened, options.dict);
}

// console.log macro, 'cache\n', cache
function arrayify(val) {
  if (check(val, Array)) {
    return val;
  }
  return [val];
}

function fullPath(p, dep) {
  if (p.startsWith('/')) {
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

function replaceAll(str, find, rep) {
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(escaped, 'g'), rep);
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

export default {
  force(dep) {
    return argv.forceAll || (argv.force && (argv.force === dep.name));
  },
  pathArray,
  globArray,
  pathSetting,
  parse,
  arrayify,
  select,
  replaceInFile,
  interpolate,
  iterable,
  iterate,
  macro,
  cache,
  printRepl,
  replaceAll,
  replace,
  name() {
    return targetPlatform();
  },
  keywords,
  selectors,
  j() {
    return os
      .cpus()
      .length;
  }
}
