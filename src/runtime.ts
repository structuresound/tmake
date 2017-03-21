import { log } from './log';

import { defaults } from './defaults';
import { Project } from './project';
import { Environment } from './environment';
import { Plugin } from './plugin';

export class Runtime {
  static pluginMap: { [index: string]: typeof Plugin } = {};
  static loadPlugins = () => {
    defaults.plugins.forEach((name) => {
      Runtime.registerPlugin(require(`./${name}`).default);
    })
  }
  static registerPlugin = (plugin: typeof Plugin) => {
    let instance: Plugin;
    try {
      const ctx = new Project({ name: 'null' }).environments[0];
      instance = new plugin(ctx);
    }
    catch (e) {
      log.error(`error creating instance of plugin while registering it`);
      throw (e);
    }
    if (!Runtime.pluginMap[instance.name]) {
      Runtime.pluginMap[instance.name] = plugin;
    } else {
      throw new Error(`plugin ${instance.name} was already registered, are you trying to override a built in plugin?`);
    }
  }
  static getPlugin = (name: string) => {
    return Runtime.pluginMap[name];
  }
}