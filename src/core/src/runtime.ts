import * as _ from 'lodash';
import { readdirSync } from 'fs';
import { mkdir } from 'shelljs'
import { join } from 'path';
import { Project } from './project';
import { Configuration } from './configuration';
import { Plugin } from './plugin';
import { Ninja } from './ninja';
import { extend, clone, contains, plain, stringify, cascade, okmap, map, flatten, union } from 'typed-json-transform';
import { parseFileSync } from './file';
import * as _os from 'os';
import { exec } from './shell';
import { next, setOptions } from 'js-moss';
import { Tools } from './tools';
import { stringHash } from './hash';

export { next } from 'js-moss';

const interpolateCache = {};

setOptions({
  shell: (string) => {
    const hash = stringHash(string);
    if (!interpolateCache[hash]) {
      interpolateCache[hash] = exec(string, { silent: true });
    }
    return interpolateCache[hash];
  }
});

function homeDir() {
  return process.env[process.platform === 'win32'
    ? 'USERPROFILE'
    : 'HOME'];
}

const npmDir = join(__dirname, '../../..');

export const args: TMake.Args = {};

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
  const selectables = _.pick(dict, ['platform', 'architecture']);
  for (const key of Object.keys(selectables)) {
    _selectors.push(`${prefix || ''}${selectables[key]}`);
  }
  return _selectors;
}

const _defaults: TMake.Defaults = <any>{};
const _targets: TMake.Targets = <any>{};
const _settings: TMake.Settings = <any>{};
const _keywords: string[] = [];
const _selectors: string[] = [];
const _environment: string[] = [];

interface MossOptions {
  stack?: TMake.Defaults
  selectors?: { [index: string]: boolean }
}


export namespace Runtime {
  export const os = {
    endianness: _os.endianness,
    platform(){return platformNames[_os.platform()]},
    arch: _os.arch,
    cpus: _os.cpus
  }

  export const pluginMap: { [index: string]: typeof Plugin } = {};
  export function moss(config: TMake.Source.Project, options: MossOptions = {}) {
    const defaultSelectors = okmap(_keywords, (keyword) => {
      return { [keyword]: <any>contains(_selectors, keyword) };
    });

    const additionalSelectors = options.selectors || {};
    const additionalKeywords = Object.keys(additionalSelectors);

    const specificSelectors = okmap(additionalKeywords, (keyword) => {
      return { [keyword]: <any>contains(_selectors, keyword) || additionalSelectors[keyword] };
    });

    const selectors = { ...defaultSelectors, ...specificSelectors };
    const layer = {
      data: {}, state: {
        auto: options.stack || _defaults,
        stack: {},
        selectors
      }
    };
    return next(layer, config);
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
    let ctx: TMake.Configuration;
    try {
      ctx = new Project({ name: 'Testing' + name + 'Plugin' }).parsed.configurations[0];
    }
    catch (e) {
      console.warn(`error: ${e.message}. while creating plugin context for ${name} plugin`);
      throw(e);
    }
    try {
      instance = new plugin(ctx);
    } catch (e){
      console.warn(`error: ${e.message}. while creating ${name} plugin`);
      throw(e);
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

  function initDefaults(cla: { [index: string]: string }) {
    console.log('load defaults');

    const { keywords } = _settings;

    const host = {
      architecture: os.arch(),
      endianness: os.endianness(),
      platform: os.platform(),
      cpu: { num: os.cpus().length, speed: os.cpus()[0].speed }
    };

    try {
      const defaultsPath = join(args.settingsDir, 'defaults.yaml');
      const defaults = parseFileSync(defaultsPath);

      if (!Object.keys(defaults).length) {
        throw new Error(`missing defaults @ ${defaultsPath}`);
      }

      defaults.host = {
        ...host, ...defaults.host
      }

      const hostKeywords = map(keywords.host, (key) => { return `host-${key}`; });
      const defaultHost = (defaults.host && defaults.host.platform) || os.platform();

      _keywords.push(...hostKeywords);
      _keywords.push(...[].concat(keywords.target)
        .concat(keywords.architecture)
        .concat(keywords.compiler)
        .concat(keywords.sdk)
        .concat(keywords.ide)
        .concat(keywords.deploy));

      const selectors = [
        parseSelectors(defaults.host, 'host-')
      ]
      _selectors.push(...flatten(selectors));

      _.each(cla, (v: string, key: string) => {
        if (contains(_keywords, key)) {
          _selectors.push(key);
        } else {
          args[key] = v || true;
        }
      });

      if (args.v) {
        if (!args.verbose) {
          args.verbose = args.v;
        }
      }
      if (args.f) {
        args.force = 'all';
      }

      // console.log('raw defaults', defaults);
      const parsedDefaults: TMake.Defaults = moss(clone(defaults)).data;
      const tools = parsedDefaults.host.tools;

      for (const name of Object.keys(tools)) {
        const tool = tools[name];
        if (tool.name == null) {
          tool.name = name;
        }
        if (tool.bin == null) {
          tool.bin = name;
          tool.bin = Tools.pathForTool(tool);
        }
      }

      const localProductPath = join(args.runDir, 'product.yaml');
      try {
        const localProduct: TMake.Product = parseFileSync(localProductPath);
        extend(parsedDefaults, { product: moss(<any>localProduct, { stack: parsedDefaults }).data });
      }
      catch {
      }

      extend(_defaults, parsedDefaults);
    }
    catch (e) {
      console.warn(`error parsing defaults: ${e.message} ${e.stack}`);
    }
  }

  export function init(cla: { [index: string]: any }, database?: TMake.Database.Interface) {
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

        initDefaults(cla);
        // initTargets();
      }
      catch (e) {
        console.warn(`error parsing settings: ${e.message} ${e.stack}`);
      }
      console.log('register plugins');
      registerPlugin(Ninja);
    }
  }
}

export { _selectors as selectors, _keywords as keywords, _defaults as defaults, _targets as targets };
