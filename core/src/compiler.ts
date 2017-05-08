import * as Bluebird from 'bluebird';
import { omit } from 'lodash';
import { existsSync } from 'fs';
import { arrayify, check, clone, combine, each, extend } from 'typed-json-transform';
import { log } from './log';
import { startsWith } from './string';
import { fetch } from './tools';
import { execAsync } from './shell';
import { args } from './args';
import { Environment } from './environment';
import { ShellPlugin } from './shell';
import { jsonStableHash } from './hash';
import { Project } from './project';
import { defaults } from './defaults';

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

function _jsonToFlags(object: any, globals: TMake.Plugin.Shell.Compiler.Flags.MapOptions) {
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

export function jsonToFlags(object: any, options?: TMake.Plugin.Shell.Compiler.Flags.MapOptions) {
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

function resolveFlags(environment: TMake.Environment, options: TMake.Plugin.Shell.Compiler.Options) {
  const cFlags = options.cFlags || options.cxxFlags || {};
  const cxxFlags = options.cxxFlags || options.cFlags || {};
  const linkerFlags = options.linkerFlags || {};
  const compilerFlags = options.compilerFlags || {};
  const frameworks = options.frameworks || {};
  return {
    compiler: extend(environment.select(defaults.flags.compiler), compilerFlags),
    linker: extend(environment.select(defaults.flags.linker), linkerFlags),
    cxx: extend(environment.select(defaults.flags.cxx), cxxFlags),
    c: omit(extend(environment.select(defaults.flags.cxx), cFlags), ['std', 'stdlib']),
    frameworks: extend(environment.select(defaults.flags.frameworks), frameworks)
  }
}

export class Compiler extends ShellPlugin {
  options: TMake.Plugin.Shell.Compiler.Options;
  flags: TMake.Plugin.Shell.Compiler.Flags;
  libs: string[];

  constructor(environment: TMake.Environment, options?: TMake.Plugin.Shell.Compiler.Options) {
    super(environment, options);
    this.name = 'compiler';
    this.projectFileName = 'CMakeLists.txt';
    this.buildFileName = 'build.ninja';
    this.flags = resolveFlags(this.environment, this.options);
  }

  frameworks() { return jsonToFrameworks(this.flags.frameworks); }
  cFlags() { return jsonToCFlags(this.flags.c); }
  cxxFlags() { return jsonToCFlags(this.flags.cxx); }
  linkerFlags() { return jsonToFlags(this.flags.linker); }
  compilerFlags() { return jsonToFlags(this.flags.compiler, { join: ' ' }); }

  fetch() {
    if (this.options.toolchain) {
      return fetch(this.options.toolchain).then((toolpaths) => this.toolpaths = toolpaths);
    }
    return Bluebird.resolve();
  }
}