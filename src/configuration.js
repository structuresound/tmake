import _ from 'lodash';
import {check} from 'js-object-tools';

import argv from './util/argv';
import {startsWith} from './util/string';
import fs from './util/fs';
import log from './util/log';

function jsonToCFlags(object) {
  const opt = _.clone(object);
  if (opt.O) {
    switch (opt.O) {
      case 3:
      case '3':
        opt.O3 = true;
        break;
      case 2:
      case '2':
        opt.O2 = true;
        break;
      case 1:
      case '1':
        opt.O1 = true;
        break;
      case 0:
      case '0':
        opt.O0 = true;
        break;
      case 's':
        opt.Os = true;
        break;
      default:
        break;
    }
    delete opt.O;
  }
  if (opt.O3) {
    delete opt.O2;
  }
  if (opt.O3 || opt.O2) {
    delete opt.O1;
  }
  if (opt.O3 || opt.O2 || opt.O1) {
    delete opt.Os;
  }
  if (opt.O3 || opt.O2 || opt.O1 || opt.Os) {
    delete opt.O0;
  }
  return jsonToFlags(opt);
}

function jsonToFrameworks(object) {
  const flags = [];
  for (const key of Object.keys(object)) {
    if (object[key]) {
      if (fs.existsSync(`/System/Library/Frameworks/${key}.framework`)) {
        flags.push(`/System/Library/Frameworks/${key}.framework/${key}`);
      } else {
        throw new Error(`can't find framework ${key}.framework in /System/Library/Frameworks`);
      }
    }
  }
  return flags;
}

function _jsonToFlags(object, options) {
  const flags = [];
  _.each(object, (opt, key) => {
    if (opt) {
      if ((typeof opt === 'string') || check(opt, Number)) {
        let {join} = options;
        if (typeof opt === 'string') {
          if (startsWith(opt, ' ')) {
            join = '';
          }
          if (startsWith(opt, '=')) {
            join = '';
          }
        }
        if (startsWith(key, options.prefix)) {
          return flags.push(`${key}${join}${opt}`);
        }
        return flags.push(`${options.prefix}${key}${join}${opt}`);
      }
      if (startsWith(key, options.prefix)) {
        return flags.push(`${key}`);
      }
      return flags.push(`${options.prefix}${key}`);
    }
  });
  return flags;
}

function jsonToFlags(object, options) {
  const defaultOptions = {
    prefix: '-',
    join: '='
  };
  if (options) {
    _.extend(defaultOptions, options);
  }
  return _jsonToFlags(object, defaultOptions);
}

const stdCompilerFlags = {
  clang: {
    ios: {
      arch: 'arm64',
      isysroot: '{CROSS_TOP}/SDKs/{CROSS_SDK}',
      'miphoneos-version-min': '={SDK_VERSION}',
      simulator: {
        'mios-simulator-version-min': '=6.1',
        isysroot: '{CROSS_TOP}/SDKs/{CROSS_SDK}'
      }
    }
  }
};
// arch: '{ARCH}'

// stdMmFlags =
//   'fobjc-abi-version': 2

const stdCxxFlags = {
  O: 2,
  mac: {
    std: 'c++11',
    stdlib: 'libc++'
  },
  linux: {
    std: 'c++0x',
    pthread: true
  }
};

const stdFrameworks = {
  mac: {
    CoreFoundation: true
  }
};

const stdLinkerFlags = {
  // static: true
  linux: {
    'lstdc++': true,
    lpthread: true
  },
  mac: {
    'lc++': true
  }
};

// const settings = [
//   'linkerFlags',
//   'cFlags',
//   'cxxFlags',
//   'compilerFlags',
//   'defines',
//   'frameworks',
//   'sources',
//   'headers',
//   'outputFile'
// ];
//
// let compiler = argv.compiler;
// if (typeof compiler === 'undefined' || compiler === null) {
//   compiler = this.cc;
// }
// const hostToolchain = this._profile.toolchain();
// log.verbose(hostToolchain);
// log.verbose(`look for compiler ${compiler}`);
// const cc = this._profile.pathForTool(hostToolchain[compiler]);
// return {hostToolchain, compiler, cc};

// const filter = ['with', 'ninja', 'cmake'].concat(settings);

class Configuration {
  constructor(profile, options) {
    this._frameworks = profile.select(options.frameworks || stdFrameworks || {});
    const cFlags = profile.select(options.cFlags || options.cxxFlags || {});
    this._cFlags = _.omit(_.extend(profile.select(stdCxxFlags), cFlags), ['std', 'stdlib']);
    const cxxFlags = profile.select(options.cxxFlags || options.cFlags || {});
    this._cxxFlags = _.extend(profile.select(stdCxxFlags), cxxFlags);
    const linkerFlags = profile.select(options.linkerFlags || {});
    this._linkerFlags = _.extend(profile.select(stdLinkerFlags), linkerFlags);
    const compilerFlags = profile.select(options.compilerFlags || {});
    this._compilerFlags = _.extend(profile.select(stdCompilerFlags), compilerFlags);
  }
  frameworks() {
    return jsonToFrameworks(this.frameworks);
  }
  cFlags() {
    return jsonToCFlags(this.cFlags);
  }
  cxxFlags() {
    return jsonToCFlags(this.cxxFlags);
  }
  linkerFlags() {
    return jsonToFlags(this.linkerFlags);
  }
  compilerFlags() {
    return jsonToFlags(this.compilerFlags, {join: ' '});
  }
}

export {Configuration, jsonToCFlags};
