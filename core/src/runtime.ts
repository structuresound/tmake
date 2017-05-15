import { readdirSync } from 'fs';

import { log } from './log';

import { defaults } from './defaults';
import { Project } from './project';
import { Environment } from './environment';
import { Plugin } from './plugin';

import { extend, clone, plain, stringify } from 'typed-json-transform';

export const args: TMake.Args = {}

export namespace Args {
  let lock = false;

  export function init(runtime: TMake.Args) {
    if (!lock) {
      lock = true;
      return extend(args, runtime);
    } else {
      throw new Error("second call to init(), something must be wrong");
    }
  }
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

export const Db: TMake.Db = <any>{}

export namespace Runtime {
  export const pluginMap: { [index: string]: typeof Plugin } = {};

  export function init(args: TMake.Args, db: TMake.Db) {
    Args.init(args);
    extend(Db, db);
  }
  export function loadPlugins() {
    const files = readdirSync(`${args.userCache}/plugins/`);
    files.forEach((file) => {
      registerPlugin(require(`${args.userCache}/plugins/${file}`).default);
    })
  }

  export function registerPlugin(plugin: typeof Plugin) {
    let instance: Plugin;
    try {
      const ctx = new Project({ name: 'null' }).environments[0];
      instance = new plugin(ctx);
    }
    catch (e) {
      log.error(`error creating instance of plugin while registering it`);
      throw (e);
    }
    if (!pluginMap[instance.name]) {
      pluginMap[instance.name] = plugin;
    } else {
      throw new Error(`plugin ${instance.name} was already registered, are you trying to override a built in plugin?`);
    }
  }

  export function getPlugin(name: string) {
    return pluginMap[name];
  }
}