import { omit } from 'lodash';
import { existsSync } from 'fs';
import { arrayify, check, clone, each, extend } from 'js-object-tools';
import { log } from './log';
import { startsWith } from './string';
import { fetch } from './tools';
import { execAsync } from './sh';
import { args } from './args';
import { Environment } from './environment';
import { ShellPlugin, ShellPluginOptions } from './sh';
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

function _jsonToFlags(object: any, globals: MapToFlagsOptions) {
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

interface MapToFlagsOptions { prefix?: string, join?: string }

export function jsonToFlags(object: any, options?: MapToFlagsOptions) {
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

export interface CompilerOptions extends ShellPluginOptions {
  cFlags?: any;
  cxxFlags?: any;
  compilerFlags?: any;
  linkerFlags?: any;

  frameworks?: any;
  matching?: any;
  headers?: any;
  libs?: any;
  includeDirs?: any;
  outputFile?: string;
}

interface SIO { [index: string]: string }

export interface Flags {
  compiler: SIO;
  linker: SIO;
  cxx: SIO;
  c: any;
  frameworks: SIO;
}

export class Compiler extends ShellPlugin {
  options: CompilerOptions;
  flags: Flags;
  libs: string[];
  
  constructor(environment: Environment) {
    super(environment);
    this.name = 'compiler';
    this.projectFileName = 'CMakeLists.txt';
    this.buildFileName = 'build.ninja';
  }

  init() {
    const b = this.environment.select(this.environment[this.name]);
    const cFlags = b.cFlags || b.cxxFlags || {};
    const cxxFlags = b.cxxFlags || b.cFlags || {};
    const linkerFlags = b.linkerFlags || {};
    const compilerFlags = b.compilerFlags || {};

    this.flags = {
      compiler: extend(this.environment.select(defaults.flags.compiler), compilerFlags),
      linker: extend(this.environment.select(defaults.flags.linker), linkerFlags),
      cxx: extend(this.environment.select(defaults.flags.cxx), cxxFlags),
      c: omit(extend(this.environment.select(defaults.flags.cxx), cFlags), ['std', 'stdlib']),
      frameworks: this.environment.select(b.frameworks || this.environment.select(defaults.flags.frameworks) || {})
    }

    this.libs = [];

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
    return Promise.resolve();
  }
}