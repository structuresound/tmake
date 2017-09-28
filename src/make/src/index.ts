/// <reference path="../interfaces/index.d.ts" />

import { existsSync } from 'fs';
import { arrayify, check, combine, OLHM } from 'typed-json-transform';
import { log, execAsync, execute, startsWith, Tools, Compiler, Runtime, jsonToFlags } from 'tmake-core';

export class Make extends Compiler {
  options: TMake.Plugin.Compiler.Options;

  constructor(environment: TMake.Configuration, options?: TMake.Plugin.Compiler.Options) {
    super(environment);
    this.name = 'make';
    this.buildFileName = 'Makefile';
  }

  configureCommand() {
    return [
      this.options.prefix,
      './configure',
      jsonToFlags(this.options.arguments, { prefix: '' }).join(' '),
      jsonToFlags(this.options.flags, { prefix: '--' }).join(' ')
    ].join(' ');
  }

  buildCommand() {
    return [
      this.options.prefix,
      'make -j' + Runtime.j(),
      jsonToFlags(this.options.arguments, { prefix: '' }).join(' '),
    ].join(' ');
  }

  installCommand() {
    return [
      this.options.prefix,
      'make install',
      jsonToFlags(this.options.arguments, { prefix: '' }).join(' '),
    ].join(' ');
  }
}

export default Make;
