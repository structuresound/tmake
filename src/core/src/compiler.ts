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
import { defaults, args } from './runtime';
import { Configuration } from './configuration';
import { deps } from './graph';
import { mkdir } from 'shelljs';
import { Shell } from './shell';
import { jsonStableHash, fileHash, fileHashSync } from './hash';
import { Project } from './project';
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

function resolveFlags(configuration: TMake.Configuration, options: TMake.Plugin.Compiler.Options) {
  const cFlags = options.cFlags || options.cppFlags || {};
  const cppFlags = options.cppFlags || options.cFlags || {};
  const linkerFlags = options.linkerFlags || {};
  const compilerFlags = options.flags || {};
  const frameworks = options.frameworks || {};

  const defaultFlags = configuration.parsed.target.flags;

  return {
    compiler: combine(defaultFlags.compiler, compilerFlags),
    linker: combine(defaultFlags.linker, linkerFlags),
    cpp: combine(defaultFlags.cpp || defaultFlags.c, cppFlags),
    c: omit(combine(defaultFlags.c || defaultFlags.cpp, cFlags), ['std', 'stdlib']),
    frameworks: combine(defaultFlags.frameworks, frameworks)
  }
}

export class Compiler extends Shell {
  options: TMake.Plugin.Compiler.Options;
  flags: TMake.Plugin.Compiler.Flags;
  libs: string[];

  constructor(configuration: TMake.Configuration, options?: TMake.Plugin.Compiler.Options) {
    super(configuration, options);
    this.name = 'compiler';
    this.projectFileName = 'CMakeLists.txt';
    this.buildFileName = 'build.ninja';
    this.flags = resolveFlags(this.configuration, this.options);
  }

  projectFilePath() {
    return join(this.configuration.parsed.d.project, this.projectFileName);
  }
  buildFilePath() {
    return join(this.configuration.parsed.d.build, this.buildFileName);
  }
  frameworks() { return jsonToFrameworks(this.flags.frameworks); }
  cFlags() { return jsonToCFlags(this.flags.c); }
  cppFlags() { return jsonToCFlags(this.flags.cpp); }
  linkerFlags() { return jsonToFlags(this.flags.linker); }
  compilerFlags() { return jsonToFlags(this.flags.compiler, { join: ' ' }); }
  sources() {
    const { configuration } = this;
    console.log('glob sources', this.options.matching);
    const patterns = arrayify(this.options.matching || defaults.glob.sources);
    return glob(patterns, configuration.parsed.d.source, configuration.project.parsed.d.source);
  }
  libraries(): PromiseLike<any> {
    const { dependencies } = this.configuration.project
    if (dependencies) {
      const stack = _.map(dependencies, (dep: Project) => {
        console.log('get libs from project', dep.cache.libs.value());
        return _.map(dep.cache.libs.value(), (lib) => {
          console.log('+', path.join(dep.parsed.d.home, lib));
          return path.join(dep.parsed.d.home, lib);
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
    if (!this.configuration.cache[this.name + '_configure']) {
      this.configuration.cache[this.name + '_configure'] = new CacheProperty<string>(() => {
        return fileHashSync(buildFilePath);
      });
    }
    const buildFileCache = this.configuration.cache[this.name + '_configure'];
    try {
      if (buildFileCache.value() === fileHashSync(buildFilePath)) {
        return Bluebird.resolve();
      }
    } catch (e) {

    }
    // console.log('dirty, exec', this.configureCommand());
    mkdir('-p', this.configuration.parsed.d.build);
    return this.fetch().then((toolpaths: any) => {
      return execAsync(this.configureCommand(), { cwd: buildFileDir, silent: !args.quiet }).then(() => {
        buildFileCache.update();
        this.configuration.cache.update();
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
