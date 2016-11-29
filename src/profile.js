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
import {parse} from './parse';

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

const DEFAULT_TARGET = {
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

const DEFAULT_ENV = fs.parseFileSync(path.join(argv.binDir, 'environment.yaml'));
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

class Profile {
  constructor(profile) {
    this.host = diff.combine(HOST_ENV, profile.host);
    this.target = diff.combine(DEFAULT_TARGET, profile.target);

    const hostSelectors = parseSelectors(this.host, 'host');
    const targetSelectors = parseSelectors(this.target, 'target');

    this.selectors = hostSelectors.concat(targetSelectors);

    const environment = diff.combine(DEFAULT_ENV, profile.environment);
    this.environment = cascade.deep(environment, keywords, this.selectors);
    this.macro = diff.combine(this.environment, {host: this.host, target: this.target});
  }
  parse(input, conf) {
    return parse(input, conf || this.macro);
  }
  select(base, options) {
    if (!base) {
      throw new Error('selecting on empty object');
    }
    const mutableOptions = diff.combine({
      ignore: {}
    }, options);

    mutableOptions.keywords = _.difference(keywords, mutableOptions.ignore.keywords);
    mutableOptions.selectors = _.difference(this.selectors, mutableOptions.ignore.selectors);

    const flattened = cascade.deep(base, mutableOptions.keywords, mutableOptions.selectors);
    return this.parse(flattened, mutableOptions.dict);
  }
  force() {
    return argv.forceAll || (argv.force && (argv.force === this.rawConfig.name));
  }
  j() {
    return this.host.cpu.num;
  }
}

export {Profile, keywords, argvSelectors};
