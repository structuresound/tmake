import * as _ from 'lodash';
import { readdirSync } from 'fs';
import * as minimist from 'minimist';
import { mkdir } from 'shelljs'
import { join } from 'path';
import { defaults } from './defaults';
import { Project } from './project';
import { Configuration } from './configuration';
import { Plugin } from './plugin';
import { Ninja } from './ninja';
import { extend, clone, plain, stringify, cascade, map, flatten } from 'typed-json-transform';
import { parseFileSync } from './file';
import * as os from 'os';
import { parse } from './parse';

export const args = <TMake.Args>minimist(process.argv.slice(2));

function homeDir() {
  return process.env[process.platform === 'win32'
    ? 'USERPROFILE'
    : 'HOME'];
}

const npmDir = join(__dirname, '../../..');

if (process.env.NODE_ENV == 'test') {
  args.v = true;
  args.verbose = true;
  args.quiet = false;
  args.runDir = `${npmDir}/test/cache`
  args.homeDir = `${npmDir}/test/homedir`;

  console.log('npmDir: ', npmDir);
  console.log('creating test dir: ', args.runDir);

  mkdir('-p', args.runDir);
  mkdir('-p', args.homeDir);
}

if (!args.npmDir) {
  args.npmDir = npmDir;
}
if (!args.runDir) {
  args.runDir = process.cwd();
}
if (!args.configDir) {
  args.configDir = args.runDir;
}
if (!args.settingsDir) {
  args.settingsDir = join(args.npmDir, 'settings');
}
if (!args.cachePath) {
  args.cachePath = 'trie_modules';
}
if (!args.program) {
  args.program = 'tmake';
}
if (!args.homeDir) {
  args.homeDir = `${homeDir()}/.tmake`;
}
if (args.v) {
  if (!args.verbose) {
    args.verbose = args.v;
  }
}
if (args.f) {
  args.force = 'all';
}

if (process.env.TMAKE_ARGS) {
  extend(args, Args.decode(process.env.TMAKE_ARGS));
}

export namespace Args {
  export function encode() {
    const cp = plain(args);
    delete cp._;
    return new Buffer(stringify(cp)).toString('base64');
  }
  export function decode(str) {
    const decoded = new Buffer(str, 'base64').toString('ascii');
    const json = JSON.parse(decoded);
    delete json._;
    return json;
  }
}

const platformNames = {
  linux: 'linux',
  darwin: 'mac',
  mac: 'mac',
  win: 'win',
  win32: 'win',
  ios: 'ios',
  android: 'android'
};

const additionalArchKeywords = {
  x64: 'x86_64',
  arm: 'armv7a'
}

export function parseSelectors(dict: any, prefix: string) {
  const _selectors: string[] = [];
  const selectables =
    _.pick(dict, ['platform', 'compiler', 'architecture']);
  for (const key of Object.keys(selectables)) {
    _selectors.push(`${prefix || ''}${selectables[key]}`);
  }
  return _selectors;
}

export class Runtime {
  static Db: TMake.Database.Interface;

  static pluginMap: { [index: string]: typeof Plugin } = {};
  static settings: TMake.Settings = <any>{};
  static keywords: string[] = [];
  static environment: TMake.Runtime.Environment = <any>{};
  static selectors: string[] = [];
  static host: TMake.Runtime.Host = <any>{};
  static defaultTarget: TMake.Platform = <any>{};
  static defaultToolchain: TMake.Tools = <any>{};

  static init(database: TMake.Database.Interface) {
    extend(this.settings, parseFileSync(join(args.settingsDir, 'settings.yaml')));

    const hostKeywords = map(this.settings.keywords.host, (key) => { return `host-${key}`; });

    this.keywords.push(...hostKeywords);
    this.keywords.push(...[].concat(this.settings.keywords.target)
      .concat(this.settings.keywords.architecture)
      .concat(this.settings.keywords.compiler)
      .concat(this.settings.keywords.sdk)
      .concat(this.settings.keywords.ide)
      .concat(this.settings.keywords.deploy));

    const HOST_ENDIANNESS = os.endianness();
    const HOST_PLATFORM = platformNames[os.platform()];
    const HOST_COMPILER = defaults.compiler[`host-${HOST_PLATFORM}`];
    const HOST_ARCHITECTURE = os.arch();
    const HOST_CPU = os.cpus();

    extend(this.host, {
      architecture: HOST_ARCHITECTURE,
      compiler: HOST_COMPILER,
      endianness: HOST_ENDIANNESS,
      platform: HOST_PLATFORM,
      cpu: { num: HOST_CPU.length, speed: HOST_CPU[0].speed }
    });

    extend(this.host, this.settings.host);
    const selectors = [
      parseSelectors(this.host, 'host-'),
      Object.keys(_.pick(args, this.keywords)),
      [args.compiler]
    ]
    this.selectors.push(...flatten(selectors));

    extend(this.defaultTarget, {
      compiler: HOST_COMPILER,
      architecture: HOST_ARCHITECTURE,
      endianness: HOST_ENDIANNESS,
      platform: HOST_PLATFORM
    });

    extend(this.defaultToolchain, cascade({
      ninja: {
        version: this.settings.plugins['ninja']['version'],
        url: 'https://github.com/ninja-build/ninja/releases/download/${version}/ninja-${host.platform}.zip'
      },
      'host-mac': { clang: { bin: '$(which gcc)' } },
      'host-linux': { gcc: { bin: '$(which gcc)' } }
    }, this.keywords, this.selectors));

    this.Db = database;
    this.registerPlugin(Ninja);
  }

  static j() { return this.host.cpu.num; }

  static loadPlugins() {
    try {
      // const files = readdirSync(`${args.homeDir}/plugins/`);
      const standardPlugins = ['cmake', 'make'];
      standardPlugins.forEach((plugin) => {
        console.log('load plugin', plugin);
        try {
          this.registerPlugin(require(`tmake-plugin-${plugin}`).default);
        } catch (error) {
          console.log("skipping bad plugin @ ", plugin, error);
        }
      })
    } catch (error) {
      console.log("bad or missing plugins folder, using internals only");
    }
  }

  static registerPlugin(plugin: typeof Plugin) {
    const { name } = (<any>plugin);
    let instance: Plugin;
    try {
      const ctx = new Project({ name }).post.configurations[0];
      instance = new plugin(ctx);
    }
    catch (e) {
      console.error(`error creating instance of plugin: ${name} while registering it`);
      throw (e);
    }
    if (!this.pluginMap[instance.name]) {
      this.pluginMap[instance.name] = plugin;
    } else {
      throw new Error(`plugin ${name} was already registered, are you trying to override a built in plugin?`);
    }
  }

  static getPlugin(name: string) {
    return this.pluginMap[name];
  }
}