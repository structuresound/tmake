import * as _ from 'lodash';
import { readdirSync } from 'fs';
import * as minimist from 'minimist';
import { mkdir } from 'shelljs'
import { join } from 'path';
import { Project } from './project';
import { Configuration } from './configuration';
import { Plugin } from './plugin';
import { Ninja } from './ninja';
import { extend, clone, contains, plain, stringify, cascade, okmap, map, flatten } from 'typed-json-transform';
import { parseFileSync } from './file';
import * as os from 'os';
import { setOptions } from 'js-moss';
import { exec } from './shell';
import { next } from 'js-moss';

export const args = <TMake.Args>minimist(process.argv.slice(2));

setOptions({
  shell: (string) => exec(string, { silent: true })
});

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
  args.runDir = `${npmDir}/tests/runtime`
  args.homeDir = `${npmDir}/tests/.tmake`;
  args.dev = true;

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
  const selectables = _.pick(dict, ['platform', 'compiler', 'architecture']);
  for (const key of Object.keys(selectables)) {
    _selectors.push(`${prefix || ''}${selectables[key]}`);
  }
  return _selectors;
}

const _defaults: TMake.Defaults = <any>{};
const _settings: TMake.Settings = <any>{};
const _keywords: string[] = [];
const _selectors: string[] = [];

export namespace Runtime {
  const AUTO_ENDIANNESS = os.endianness();
  const AUTO_PLATFORM = platformNames[os.platform()];
  const AUTO_ARCHITECTURE = os.arch();
  const AUTO_CPU = os.cpus();

  export const pluginMap: { [index: string]: typeof Plugin } = {};

  export function moss(config: TMake.Yaml.File, additionalSelectors?: any) {
    const selectors = okmap(_keywords, (keyword) => {
      return { [keyword]: <any>contains(_selectors, keyword) };
    });
    const state = {
      auto: {},
      selectors: { ...selectors, ...additionalSelectors }
    }
    return next({ data: {}, state }, config);
  }

  export function j() { return _defaults.host.cpu.num; }


  export let Db: TMake.Database.Interface;

  export function loadPlugins() {
    try {
      const plugRoot = `${args.homeDir}/plugins/node_modules`;
      mkdir('-p', plugRoot);
      const plugFolders = readdirSync(plugRoot);
      plugFolders.forEach((folder) => {
        const plugin = join(plugRoot, folder)
        // console.log('load plugin', plugin);
        try {
          registerPlugin(require(plugin).default);
        } catch (error) {
          console.warn("skipping bad plugin @ ", plugin, error);
        }
      })
    } catch (error) {
      console.warn("bad or missing plugins folder, using internals only", error);
    }
  }

  export function registerPlugin(plugin: typeof Plugin) {
    const { name } = (<any>plugin);
    let instance: Plugin;
    try {
      const ctx = new Project({ name: 'Testing' + name + 'Plugin' }).parsed.configurations[0];
      instance = new plugin(ctx);
    }
    catch (e) {
      console.error(`error creating instance of plugin: ${name} while registering it`);
      throw (e);
    }
    if (!pluginMap[instance.name]) {
      pluginMap[instance.name] = plugin;
    } else {
      console.warn(`plugin ${name} was already registered, are you trying to override a built in plugin?`);
    }
  }

  export function getPlugin(name: string) {
    return pluginMap[name];
  }

  function initDefaults() {
    const { defaults, keywords } = _settings;

    const host = {
      architecture: AUTO_ARCHITECTURE,
      endianness: AUTO_ENDIANNESS,
      platform: AUTO_PLATFORM,
      cpu: { num: AUTO_CPU.length, speed: AUTO_CPU[0].speed }
    };

    defaults.host = {
      ...host, ...defaults.host
    }

    const hostKeywords = map(keywords.host, (key) => { return `host-${key}`; });
    const defaultHost = (defaults.host && defaults.host.platform) || AUTO_PLATFORM;

    _keywords.push(...hostKeywords);
    _keywords.push(...[].concat(keywords.target)
      .concat(keywords.architecture)
      .concat(keywords.compiler)
      .concat(keywords.sdk)
      .concat(keywords.ide)
      .concat(keywords.deploy));

    const selectors = [
      parseSelectors(defaults.host, 'host-'),
      Object.keys(_.pick(args, _keywords)),
      [args.compiler]
    ]
    _selectors.push(...flatten(selectors));

    const parsed = moss(defaults).data;

    parsed.target = {
      ...{
        architecture: AUTO_ARCHITECTURE,
        endianness: AUTO_ENDIANNESS,
        platform: AUTO_PLATFORM
      }, ...parsed.target
    }

    extend(_defaults, parsed);
  }

  export function init(database: TMake.Database.Interface) {
    if (database) {
      Db = database;
    }
    if (!Object.keys(_settings).length) {
      try {
        const settingsPath = join(args.settingsDir, 'settings.yaml');
        extend(_settings, parseFileSync(settingsPath));

        if (!Object.keys(_settings).length) {
          throw new Error(`missing settings @ ${settingsPath}`);
        }

        initDefaults();
      }
      catch (e) {
        console.warn(`error parsing settings: ${e.message} ${e.stack}`);
      }
      registerPlugin(Ninja);
    }
  }
}

export { _selectors as selectors, _keywords as keywords, _defaults as defaults };
