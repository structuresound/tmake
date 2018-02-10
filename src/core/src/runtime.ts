import * as _ from 'lodash';
import { readdirSync } from 'fs';
import { mkdir } from 'shelljs'
import { join } from 'path';
import { Project } from './project';
import { Product } from './product';
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
if (!args.program) {
  args.program = 'tmake';
}
if (!args.homeDir) {
  args.homeDir = `${homeDir()}/.tmake`;
}
if (!args.cachePath){
  args.cachePath = 'package';
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


const environmentDefaultsPath = join(args.settingsDir, 'environment.yaml');
let environment;
try {
  environment = parseFileSync(environmentDefaultsPath);
} catch (e){
  throw new Error(`missing settings file @ ${environmentDefaultsPath}`);
}

let localEnvironment = {};
const localEnvironmentPath = join(args.runDir, 'environment.yaml');
try {
  const localEnvironment: TMake.Environment = parseFileSync(localEnvironmentPath);
}
catch {
}

interface MossOptions<T> {
  environment?: any,
  selectors: { [index: string]: boolean }
}

export namespace Runtime {
  export const keywords: string[] = [];
  export const selectors: string[] = [];

  export const os = {
    endianness: _os.endianness,
    platform(){return settings.platform.name[_os.platform()]},
    arch(){ return <TMake.Target.Architecture>_os.arch()},
    cpus: _os.cpus
  }

  export const pluginMap: { [index: string]: typeof Plugin } = {};
  export function moss<T>(config: T, options: MossOptions<T> = {selectors:{}}) {
    const defaultSelectors = okmap(keywords, (keyword) => {
      return { key: keyword, value: <any>contains(selectors, keyword) };
    });

    const additionalSelectors = options.selectors || {};
    const additionalKeywords = Object.keys(additionalSelectors);

    const specificSelectors = okmap(additionalKeywords, (keyword) => {
      return { key: keyword, value: <any>contains(selectors, keyword) || additionalSelectors[keyword] };
    });

    const environment = {...defaults.environment, ...options.environment};
    if ((<any>config).environment){
      extend(environment, (<any>config).environment);
    }
    const s = { ...defaultSelectors, ...specificSelectors };
    const layer = {
      data: {}, state: {
        auto: {environment, settings},
        stack: {},
        selectors: s
      }
    };
    return next(layer, config).data;
  }

  export function inherit<T>(parent: T, child: T, options: MossOptions<T> = {selectors: {}}){
    const inherit = Runtime.moss(parent, options);
    return inheritParsed(inherit, child, options);
  }

  export function inheritParsed<T>(parent: T, child: T, options: MossOptions<T> = {selectors: {}}){
    const inherit = clone(parent);
    if (!options.environment) options.environment = {};
    options.environment.parent = inherit;
    const local = Runtime.moss(clone(child), options);
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
    let configuration: TMake.Configuration;
    try {
      const { test } = defaults.environment.target;
      const platformName = Object.keys(test)[0];
      const platform = test[platformName];
      const architecture = Object.keys(platform)[0];
      const { platforms } = new Product({});
      configuration = platforms[platformName][architecture];
      if (!configuration) throw new Error(`no configuration for ${platform}-${architecture}`);
    }
    catch (e) {
      console.warn(`error: ${e.message}. while creating plugin context for ${name} plugin`);
      throw(e);
    }
    try {
      instance = new plugin(configuration);
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
    // cleanup
    while(keywords.length) keywords.pop();
    while(selectors.length) selectors.pop();

    const { keyword } = clone(settings);

    const host: TMake.Host = {
      platform: os.platform() as any,
      architecture: os.arch(),
      endianness: os.endianness(),
      cpu: { num: os.cpus().length, speed: os.cpus()[0].speed }
    };

    try {
      const hostKeywords = map(keyword.host, (key) => { return `host-${key}`; });

      keywords.push(...hostKeywords);
      keywords.push(...keyword.target
        .concat(keyword.architecture)
        .concat(keyword.compiler)
        .concat(keyword.sdk)
        .concat(keyword.ide)
        .concat(keyword.deploy));

      const parsedSelectors = [
        parseSelectors(host, 'host-')
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

      const withAutoHost = {...environment, host: { ...host, ...environment.host}};
      const parsedEnvironment: TMake.Environment = inherit(withAutoHost, localEnvironment);
      
      const buildPlatforms: TMake.Platforms.File = <any>parsedEnvironment.target.lib;
      parsedEnvironment.target.lib = okmap(buildPlatforms, (targets, platform) => {
        return okmap(targets, (target, architecture) => {
          return {...target, platform}
        });
      });

      const testPlatforms: TMake.Platforms.File = <any>parsedEnvironment.target.test;
      parsedEnvironment.target.test = okmap(testPlatforms, (targets, platform) => {
        return okmap(targets, (target, architecture) => {
          return {...target, platform}
        });
      });
      // console.log('parsed build', JSON.stringify(parsedEnvironment.build, null, 2));

      const {tools} = parsedEnvironment;
      parsedEnvironment.tools = okmap(tools, (tool, name: string) => {
        if (tool.name == null) {
          tool.name = name;
        }
        if (tool.bin == null) {
          tool.bin = name;
          tool.bin = Tools.pathForTool(tool);
        }
        return tool;
      });

      defaults.environment = parsedEnvironment;
      const projectDefaultsPath = join(args.settingsDir, 'project.yaml');
      try {
        extend(defaults, parseFileSync(projectDefaultsPath));
      }
      catch(e){
        throw new Error(`missing settings file @ ${projectDefaultsPath}`);
      }
    }
    catch (e) {
      console.warn(`error parsing defaults: ${e.message} ${e.stack}`);
    }
  }

  export function init({commandLine, database}: RuntimeArgs) {
    if (database) {
      Db = database;
    }
    initDefaults(commandLine);
    registerPlugin(Ninja);
  }
}
