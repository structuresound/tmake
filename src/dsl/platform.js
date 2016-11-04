import os from 'os';
import _ from 'underscore';
import path from 'path';
import colors from 'chalk';
import Promise from 'bluebird';
import { Map } from 'immutable';

import cascade from './cascade';
import check from '../util/check';
import sh from '../util/sh';
import interpolate from './interpolate';
import fs from '../util/fs';
import argv from '../util/argv';


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
    const interpolated = m;
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
  const res = Promisearse(m.macro, dict);
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
  for (const k in o) {
    if (check(o[k], String)) {
      o[k] = fn(o[k]);
    } else if (check(o[k], Object) || check(o[k], Array)) {
      allStrings(o[k], fn);
    }
  }
  return o;
}

function Promisearse(_val, dict) {
  var val = _.clone(_val)
  if (dict) {
    val = interpolate(val, dict);
  }
  val = interpolate(val, macro);
  return replace(val, dict);
}

function parse(conf, dict) {
  if (check(conf, String)) {
    return Promisearse(conf, dict);
  } else if (check(conf, Object)) {
    if (conf.macro) {
      // log.verbose 'parsing macro object, #{JSON.stringify conf}'
      return objectReplace(conf, dict || {});
    }
    if (!dict) {
      dict = conf;
    }
    return allStrings(_.clone(conf), val => parse(val, dict));
  } else {
    return conf;
  }
}

_.extend(macro, cascade.deep(macros, keywords, [targetPlatform()]));

function select(base, options) {
  if (!base) {
    return;
  }
  if (typeof options === 'undefined' || options === null) {
    options = {};
  }
  if (options.ignore) {
    options.keywords = _.difference(keywords, options.ignore);
    options.selectors = _.difference(selectors, options.ignore);
  }
  const flattened = cascade.deep(_.clone(base), options.keywords || keywords, options.selectors || selectors);
  return parse(flattened, options.dict);
}

// console.log macro, 'cache\n', cache
function arrayify(val) {
  if (check(val, Array)) {
    return val;
  } else {
    return [val];
  }
}

function fullPath(p) {
  if (p.startsWith('/')) {
    return p;
  } else {
    return path.join(rootConfig.d.root, p);
  }
}

function pathArray(val) {
  _.map(arrayify(val), v => pathSetting(v));
}

function pathSetting(val) {
  fullPath(parse(val));
}

function globArray(val) {
  _.map(arrayify(val), v => parse(v));
}

function leaves(root, fn) {
  if (Array.isArray(root) || (root !== null && typeof val === 'object')) {
    return (() => {
      const result = [];
      for (const i in root) {
        result.push(leaves(i, fn));
      }
      return result;
    })();
  } else {
    return fn(root);
  }
}

function replaceAll(str, find, replace) {
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(escaped, 'g'), replace);
}

function iterable(val) {
  if (check(val, Array)) {
    return val;
  } else if (check(val, Object)) {
    return _.map(val, v => v);
  } else {
    return [val];
  }
}

function iterateConf(confObject, commandObject, ignore) {
  if (typeof ignore === 'undefined' || ignore === null) {
    ignore = [];
  }
  if (check(confObject, String)) {
    confObject = [confObject];
  }
  const validCommands = [];
  _.each(confObject, function(v, k) {
    if (check(k, Number)) {
      k = 'shell';
    } else if (_.contains(ignore, k)) {
      return;
    }
    return validCommands.push({obj: v, key: k});
  });
  return _p(validCommands, function(i) {
    if (commandObject[i.key]) {
      return commandObject[i.key](i.obj);
    } else {
      return commandObject.any(i.obj);
    }
  });
}

function printRepl(r, localDict) {
  const string = '\n';
  _.each(r.inputs, function(v, k) {
    if (r.directive) {
      k = `${r.directive.prepost || r.directive.pre || ''}${k}${r.directive.prepost || r.directive.post || ''}`;
    }
    return string += `${k} : ${parse(v, localDict)}\n`;
  });
  return string;
}

function replaceInFile(f, r, localDict) {
  if (!fs.existsSync(f)) {
    throw new Error(`no file at ${f}`);
  }
  if (!r.inputs) {
    throw new Error(`repl entry has no inputs object or array, ${JSON.stringify(r, 0, 2)}`);
  }
  const stringFile = fs.readFileSync(f, 'utf8');
  const {inputs} = r;
  _.each(inputs, function(v, k) {
    if (Array.isArray(v)) {
      var parsedKey = v[0];
      var parsedVal = v[1];
    } else {
      var parsedKey = parse(k, localDict);
      var parsedVal = parse(v, localDict);
    }
    if (r.directive) {
      var parsedKey = `${r.directive.prepost || r.directive.pre || ''}${parsedKey}${r.directive.prepost || r.directive.post || ''}`;
    }
    if (argv.verbose) {
      if (stringFile.includes(parsedKey)) {
        console.log(colors.green(`[ replace ] ${parsedKey}`, colors.magenta(`: ${parsedVal}`)));
      }
    }
    return stringFile = replaceAll(stringFile, parsedKey, parsedVal);
  });
  const format = {
    ext: path.extname(f),
    name: path.basename(f, path.extname(f)),
    dir: path.dirname(f),
    base: path.basename(f)
  };
  if (format.ext = '.in') {
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
  const existingString = '';
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
  iterate : iterateConf,
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
