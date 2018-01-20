import * as _ from 'lodash';
import { readdirSync } from 'fs';
import { mkdir } from 'shelljs'
import { join } from 'path';
import { Project } from './project';
import { Configuration } from './configuration';
import { Plugin } from './plugin';
import { Ninja } from './ninja';
import { extend, clone, merge, contains, plain, stringify, cascade, okmap, map, flatten, union } from 'typed-json-transform';
import { parseFileSync } from './file';
import * as _os from 'os';
import { exec } from './shell';
import { next, setOptions } from 'js-moss';
import { Tools } from './tools';
import { stringHash } from './hash';
import { TMake } from './index';

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

export function parseSelectors(dict: any, prefix: string) {
  const _selectors: string[] = [];
  const selectables = _.pick(dict, ['platform', 'architecture']);
  for (const key of Object.keys(selectables)) {
    _selectors.push(`${prefix || ''}${selectables[key]}`);
  }
  return _selectors;
}

export const defaults: TMake.Defaults = <any>{};
export const settings: TMake.Settings = <any>{};
export const keywords: string[] = [];
export const selectors: string[] = [];

interface MossOptions<T> {
  stack?: {
    environment?: TMake.Environment,
    settings?: TMake.Settings,
    parent?: T
  }
  selectors?: { [index: string]: boolean }
}


export namespace Runtime {
  export const os = {
    endianness: _os.endianness,
    platform(){return settings.platform.name[_os.platform()]},
    arch: _os.arch,
    cpus: _os.cpus
  }

  export const pluginMap: { [index: string]: typeof Plugin } = {};
  export function moss<T>(config: T, options: MossOptions<T> = {}) {
    const defaultSelectors = okmap(keywords, (keyword) => {
      return { [keyword]: <any>contains(selectors, keyword) };
    });

    const additionalSelectors = options.selectors || {};
    const additionalKeywords = Object.keys(additionalSelectors);

    const specificSelectors = okmap(additionalKeywords, (keyword) => {
      return { [keyword]: <any>contains(selectors, keyword) || additionalSelectors[keyword] };
    });

    const s = { ...defaultSelectors, ...specificSelectors };
    const layer = {
      data: {}, state: {
        auto: options.stack || defaults,
        stack: {},
        selectors: s
      }
    };
    return next(layer, config);
  }

  export function inherit<T>(parent: T, child: T, options: MossOptions<T>){
    const inherit = Runtime.moss(clone(parent), options).data;
    options.stack.parent = inherit;
    const local = Runtime.moss(clone(child), options).data;
    return merge(inherit, local);
  }

  export function j() { return defaults.environment.host.cpu.num; }


  export let Db: TMake.Database.Interface;

  export function loadPlugins() {
    try {
      const plugRoot = `${args.homeDir}/plugins/node_modules`;
      mkdir('-p', plugRoot);
      const plugFolders = readdirSync(plugRoot);
      plugFolders.forEach((folder) => {
        const plugin = join(plugRoot, folder);
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
      const {architecture} = defaults.environment.host;
      ctx = new Project({ name: 'Testing' + name + 'Plugin' }).parsed.configurations[architecture];
    }
    catch (e) {
      console.warn(`error: ${e.message}. while creating plugin context for ${name} plugin`);
      throw(e);
    }
    try {
      instance = new plugin(ctx);
      pluginMap[instance.name] = plugin;
    } catch (e){
      console.warn(`error: ${e.message}. while creating ${name} plugin`);
      throw(e);
    }
  }

  export function getPlugin(name: string) {
    return pluginMap[name];
  }

  function initDefaults(cla: { [index: string]: string }) {
    const { keyword } = settings;

    const host = {
      architecture: os.arch(),
      endianness: os.endianness(),
      platform: os.platform() as any,
      cpu: { num: os.cpus().length, speed: os.cpus()[0].speed }
    };

    let environment: TMake.Environment;
    let project: TMake.Project;

    const environmentDefaultsPath = join(args.settingsDir, 'environment.yaml');
    try {
      environment = parseFileSync(environmentDefaultsPath);
    } catch (e){
      throw new Error(`missing settings file @ ${environmentDefaultsPath}`);
    }
    const projectDefaultsPath = join(args.settingsDir, 'project.yaml');
    try {
      project = parseFileSync(projectDefaultsPath);
    }
    catch(e){
      throw new Error(`missing settings file @ ${projectDefaultsPath}`);
    }
    try {
      environment.host = {
        ...host, ...environment.host
      }

      const hostKeywords = map(keyword.host, (key) => { return `host-${key}`; });
      const defaultHost = (environment.host && environment.host.platform) || os.platform();

      keywords.push(...hostKeywords);
      keywords.push(...[].concat(keyword.target)
        .concat(keyword.architecture)
        .concat(keyword.compiler)
        .concat(keyword.sdk)
        .concat(keyword.ide)
        .concat(keyword.deploy));

      const parsedSelectors = [
        parseSelectors(environment.host, 'host-')
      ]
      selectors.push(...flatten(parsedSelectors));

      _.each(cla, (v: string, key: string) => {
        if (contains(keywords, key)) {
          selectors.push(key);
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

      const parsedEnvironment: TMake.Environment = moss(clone(environment), {
        stack: environment as any
      }).data;
      
      const localEnvironmentPath = join(args.runDir, 'environment.yaml');
      try {
        const localProduct: TMake.Environment = parseFileSync(localEnvironmentPath);
        extend(parsedEnvironment, { product: moss(<any>localProduct, { stack: parsedEnvironment as any }).data });
      }
      catch {
      }

      const {tools} = parsedEnvironment;
      
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

      defaults.environment = parsedEnvironment;
      defaults.project = project;
    }
    catch (e) {
      console.warn(`error parsing defaults: ${e.message} ${e.stack}`);
    }
  }

  export function init(cla: { [index: string]: any }, database?: TMake.Database.Interface) {
    if (database) {
      Db = database;
    }

    const listsPath = join(args.settingsDir, 'keywords.yaml');
    try {
      extend(settings, {keyword: parseFileSync(listsPath)});
    }
    catch(e){
      throw new Error(`missing settings file @ ${listsPath}`);
    }
    const dictionariesPath = join(args.settingsDir, 'dictionaries.yaml');
    try {
    extend(settings, parseFileSync(dictionariesPath));
    } 
    catch(e){
      throw new Error(`missing settings file @ ${dictionariesPath}`);
    }
    initDefaults(cla);
    registerPlugin(Ninja);
  }
}
