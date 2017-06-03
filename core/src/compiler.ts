import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import * as path from 'path';
import { omit } from 'lodash';
import { existsSync } from 'fs';
import { arrayify, check, clone, map, combine, each, extend } from 'typed-json-transform';
import { log } from './log';
import { startsWith } from './string';
import { Tools } from './tools';
import { execAsync } from './shell';
import { args } from './runtime';
import { Environment } from './environment';
import { deps } from './graph';
import { mkdir } from 'shelljs';
import { Shell } from './shell';
import { jsonStableHash, fileHash, fileHashSync } from './hash';
import { Project } from './project';
import { defaults } from './defaults';
import { join, dirname } from 'path';
import { errors, TMakeError } from './errors';
import { Property as CacheProperty } from './cache';
import { glob } from './file';

export function jsonToFrameworks(object: any) {
  const flags: string[] = [];
  for (const key of Object.keys(object)) {
    if (object[key]) {
      if (existsSync(`/System/Library/Frameworks/${key}.framework`)) {
        flags.push(`/System/Library/Frameworks/${key}.framework/${key}`);
      } else {
        throw new Error(
          `can't find framework ${key}.framework in /System/Library/Frameworks`);
      }
    }
  }
  return flags;
}

function _jsonToFlags(object: any, globals: TMake.Plugin.Compiler.Flags.MapOptions) {
  const flags: string[] = [];
  each(object, (val: any, key: string) => {
    let { prefix } = globals;
    let { join } = globals;
    let rhs = val || '';
    if (startsWith(key, prefix)) {
      prefix = ''
    }
    if ((typeof rhs === 'string')) {
      if (startsWith(rhs, ' ')) {
        join = '';
      }
      if (startsWith(rhs, '=')) {
        join = '';
      }
    }
    if (typeof rhs === 'boolean') {
      rhs = '';
      join = '';
    }
    flags.push(`${prefix}${key}${join}${rhs}`);
  });
  return flags;
}

export function jsonToFlags(object: any, options?: TMake.Plugin.Compiler.Flags.MapOptions) {
  const defaults = { prefix: '-', join: '=' };
  extend(defaults, options);
  return _jsonToFlags(object, defaults);
}

export function jsonToCFlags(object: any) {
  const opt = clone(object);
  if (opt.O) {
    switch (opt.O) {
      case 3:
      case '3':
        opt.O3 = true;
        break;
      case 2:
      case '2':
        opt.O2 = true;
        break;
      case 1:
      case '1':
        opt.O1 = true;
        break;
      case 0:
      case '0':
        opt.O0 = true;
        break;
      case 's':
        opt.Os = true;
        break;
      default:
        break;
    }
    delete opt.O;
  }
  if (opt.O3) {
    delete opt.O2;
  }
  if (opt.O3 || opt.O2) {
    delete opt.O1;
  }
  if (opt.O3 || opt.O2 || opt.O1) {
    delete opt.Os;
  }
  if (opt.O3 || opt.O2 || opt.O1 || opt.Os) {
    delete opt.O0;
  }
  return jsonToFlags(opt);
}

function resolveFlags(environment: TMake.Environment, options: TMake.Plugin.Compiler.Options) {
  const cFlags = options.cFlags || options.cxxFlags || {};
  const cxxFlags = options.cxxFlags || options.cFlags || {};
  const linkerFlags = options.linkerFlags || {};
  const compilerFlags = options.flags || {};
  const frameworks = options.frameworks || {};
  return {
    compiler: extend(environment.select(defaults.flags.compiler), compilerFlags),
    linker: extend(environment.select(defaults.flags.linker), linkerFlags),
    cxx: extend(environment.select(defaults.flags.cxx), cxxFlags),
    c: omit(extend(environment.select(defaults.flags.cxx), cFlags), ['std', 'stdlib']),
    frameworks: extend(environment.select(defaults.flags.frameworks), frameworks)
  }
}

export class Compiler extends Shell {
  options: TMake.Plugin.Compiler.Options;
  flags: TMake.Plugin.Compiler.Flags;
  libs: string[];

  constructor(environment: TMake.Environment, options?: TMake.Plugin.Compiler.Options) {
    super(environment, options);
    this.name = 'compiler';
    this.projectFileName = 'CMakeLists.txt';
    this.buildFileName = 'build.ninja';
    this.flags = resolveFlags(this.environment, this.options);
  }

  projectFilePath() {
    return join(this.environment.d.project, this.projectFileName);
  }
  buildFilePath() {
    return join(this.environment.d.build, this.buildFileName);
  }
  frameworks() { return jsonToFrameworks(this.flags.frameworks); }
  cFlags() { return jsonToCFlags(this.flags.c); }
  cxxFlags() { return jsonToCFlags(this.flags.cxx); }
  linkerFlags() { return jsonToFlags(this.flags.linker); }
  compilerFlags() { return jsonToFlags(this.flags.compiler, { join: ' ' }); }
  sources() {
    const { environment } = this;
    console.log('glob sources', this.options.matching);
    const patterns = arrayify(this.options.matching || defaults.sources.glob);
    return glob(patterns, environment.d.source, environment.project.d.source);
  }
  libraries(): PromiseLike<any> {
      const {require} = this.environment.project
      if (require) {
        const stack = _.map(require, (dep: Project) => {
          console.log('get libs from project', dep.cache.libs.value());
          return _.map(dep.cache.libs.value(), (lib) => {
            console.log('+', path.join(dep.d.home, lib));
            return path.join(dep.d.home, lib);
          })
        })
        return Bluebird.resolve(_.flatten(stack));
      }
      return Bluebird.resolve()
  }
  fetch() {
    if (this.options.toolchain) {
      return Tools.fetch(this.options.toolchain).then((toolpaths) => this.toolpaths = toolpaths);
    }
    return Bluebird.resolve();
  }

  public configure(): PromiseLike<any> {
    this.ensureProjectFile();
    const buildFilePath = this.buildFilePath();
    const buildFileDir = dirname(buildFilePath);
    console.log('check cache for matching file', buildFilePath);
    if (!this.environment.cache[this.name + '_configure']) {
      this.environment.cache[this.name + '_configure'] = new CacheProperty<string>(() => {
        return fileHashSync(buildFilePath);
      });
    }
    const buildFileCache = this.environment.cache[this.name + '_configure'];
    try {
      if (buildFileCache.value() === fileHashSync(buildFilePath)) {
        return Bluebird.resolve();
      }
    } catch (e) {

    }
    console.log('dirty, exec', this.configureCommand());
    mkdir('-p', this.environment.d.build);
    return this.fetch().then((toolpaths: any) => {
      return execAsync(this.configureCommand(), { cwd: buildFileDir, silent: !args.quiet }).then(() => {
        buildFileCache.update();
        this.environment.cache.update();
      });
    })
  }
  public build(): PromiseLike<any> {
    this.ensureBuildFile();
    return this.fetch().then((toolpaths: any) => {
      const command = this.buildCommand(this.toolpaths);
      if (command) {
        const wd = dirname(this.buildFilePath());
        log.verbose(command);
        return execAsync(command, {
          cwd: wd,
          silent: !args.verbose,
          short: this.name
        });
      }
      throw new Error(`no build command for shell plugin ${this.name}`);
    });
  }
  public install(): PromiseLike<any> {
    const installCommand = this.installCommand();
    if (installCommand) {
      const wd = dirname(this.buildFilePath());
      return execAsync(installCommand, {
        cwd: wd,
        silent: !args.verbose,
        short: this.name
      });
    }
  }
  public ensureProjectFile(isTest?: boolean) {
    const filePath = this.projectFilePath();
    if (!check(filePath, 'String')) {
      throw new Error('no build file specified');
    }
    if (!existsSync(filePath)) {
      errors.configure.noProjectFile(this);
    }
  }
  public ensureBuildFile(isTest?: boolean) {
    const buildFilePath = this.buildFilePath();
    if (!check(buildFilePath, 'String')) {
      throw new Error('no build file specified');
    }
    if (!existsSync(buildFilePath)) {
      errors.build.noBuildFile(this);
    }
  }
}