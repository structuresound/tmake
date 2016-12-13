import os from 'os';
import _ from 'lodash';
import path from 'path';
import {diff} from 'js-object-tools';
import cascade from './util/cascade';
import file from './util/file';
import args from './util/args';
import {parse, pathSetting} from './parse';

const settings = file.parseFileSync(path.join(args.binDir, 'settings.yaml'));

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

const ninjaVersion = 'v1.7.1';

const HOST_ENV = {
  architecture: HOST_ARCHITECTURE,
  endianness: HOST_ENDIANNESS,
  compiler: settings.defaultCompiler[HOST_PLATFORM],
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

function parseSelectors(dict, prefix) {
  const _selectors = [];
  const selectables = _.pick(dict, ['platform', 'compiler']);
  for (const key of Object.keys(selectables)) {
    _selectors.push(`${prefix || ''}${selectables[key]}`);
  }
  return _selectors;
}

const DEFAULT_ENV = file.parseFileSync(path.join(args.binDir, 'environment.yaml'));
const _keywords = file.parseFileSync(path.join(args.binDir, 'keywords.yaml'));
const keywords = [].concat(_.map(_keywords.host, (key) => {
  return `host-${key}`;
}))
  .concat(_keywords.target)
  .concat(_keywords.build)
  .concat(_keywords.compiler)
  .concat(_keywords.sdk)
  .concat(_keywords.ide)
  .concat(_keywords.deploy);

const argvSelectors = Object.keys(_.pick(args, keywords));
argvSelectors.push(args.compiler);

class Profile {
  constructor(configuration) {
    this.host = diff.combine(HOST_ENV, configuration.host);
    this.target = diff.combine(DEFAULT_TARGET, configuration.target);

    const hostSelectors = parseSelectors(this.host, 'host-');
    const targetSelectors = parseSelectors(this.target);

    this.selectors = hostSelectors.concat(targetSelectors);

    const environment = diff.combine(DEFAULT_ENV, configuration.environment);
    this.environment = cascade.deep(environment, keywords, this.selectors);
    this.macro = diff.combine(this.environment, {
      host: this.host,
      target: this.target
    });

    const stdChain = {
      ninja: {
        version: ninjaVersion,
        url: 'https://github.com/ninja-build/ninja/releases/download/{host.toolchain.ninja.version}/ninja-{host.platform}.zip'
      },
      'host-mac': {
        clang: {
          bin: '$(which gcc)'
        }
      },
      'host-linux': {
        gcc: {
          bin: '$(which gcc)'
        }
      }
    };

    this.host.toolchain = diff.combine(stdChain, this.host.toolchain);
  }
  parse(input, conf) {
    if (conf) {
      console.log('parsing with conf', conf);
    }
    return parse(input, conf || this.macro);
  }
  select(base, options = {
    ignore: {}
  }) {
    if (!base) {
      throw new Error('selecting on empty object');
    }
    const mutableOptions = diff.clone(options);

    mutableOptions.keywords = _.difference(keywords, mutableOptions.ignore.keywords);
    mutableOptions.selectors = _.difference(this.selectors, mutableOptions.ignore.selectors);

    const flattened = cascade.deep(base, mutableOptions.keywords, mutableOptions.selectors);
    const parsed = this.parse(flattened, mutableOptions.dict);
    return parsed;
  }
  selectToolchain() {
    const buildSystems = ['cmake', 'ninja'];
    const compilers = ['clang', 'gcc', 'msvc'];
    const selectedToolchain = this.select(this.host.toolchain, {
      ignore: {
        keywords: buildSystems.concat(compilers)
      }
    });
    for (const name of Object.keys(selectedToolchain)) {
      const tool = selectedToolchain[name];
      if (tool.bin == null) {
        tool.bin = name;
      }
      if (tool.name == null) {
        tool.name = name;
      }
    }
    return selectedToolchain;
  }
  j() {
    return this.host.cpu.num;
  }
}

export {Profile, keywords, argvSelectors};
