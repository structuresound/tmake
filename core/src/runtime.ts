import { readdirSync } from 'fs';
import * as minimist from 'minimist';
import * as _ from 'lodash';
import { mkdir } from 'shelljs'
import { join } from 'path';
import { defaults } from './defaults';
import { Project } from './project';
import { Environment } from './environment';
import { Plugin } from './plugin';
import { Ninja } from './ninja';
import { extend, clone, plain, stringify } from 'typed-json-transform';

export const args = <TMake.Args>minimist(process.argv.slice(2));

function homeDir() {
  return process.env[process.platform === 'win32'
    ? 'USERPROFILE'
    : 'HOME'];
}

const npmDir = join(__dirname, '../..');

if (process.env.NODE_ENV == 'test') {
  args.v = true;
  args.verbose = true;
  args.quiet = false;
  args.runDir = `${npmDir}/test/cache`
  args.homeDir = `${npmDir}/test/homedir`;

  mkdir('-p', args.runDir);
  mkdir('-p', args.homeDir);
  console.log('creating test dir: ', args.runDir);
  // process.chdir(args.runDir);
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

export class Runtime {
  static Db: TMake.Database.Interface;

  static pluginMap: { [index: string]: typeof Plugin } = {};
  static init(database: TMake.Database.Interface) {
    this.Db = database;
    this.registerPlugin(Ninja);
  }

  static loadPlugins() {
    try {
      const files = readdirSync(`${args.homeDir}/plugins/`);
      files.forEach((file) => {
        try {
          this.registerPlugin(require(`${args.homeDir}/plugins/${file}`).default);
        } catch (error) {
          console.log("skipping bad plugin @ ", file);
        }
      })
    } catch (error) {
      console.log("bad or missing plugins folder, using internals only");
    }
  }

  static registerPlugin(plugin: typeof Plugin) {
    let instance: Plugin;
    try {
      const ctx = new Project({ name: 'null' }).environments[0];
      instance = new plugin(ctx);
    }
    catch (e) {
      console.error(`error creating instance of plugin while registering it`);
      throw (e);
    }
    if (!this.pluginMap[instance.name]) {
      this.pluginMap[instance.name] = plugin;
    } else {
      throw new Error(`plugin ${instance.name} was already registered, are you trying to override a built in plugin?`);
    }
  }

  static getPlugin(name: string) {
    return this.pluginMap[name];
  }
}