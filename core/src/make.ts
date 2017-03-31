import { existsSync } from 'fs';
import { arrayify, check, combine } from 'typed-json-transform';
import { execAsync } from './shell';
import { Compiler, jsonToFlags } from './compiler';
import { PluginOptions } from './plugin';
import { updateProject, updateEnvironment } from './db';
import { fileHash } from './hash';
import { log } from './log';
import { startsWith } from './string';
import { fetch } from './tools';
import { args } from './args';
import { Environment } from './environment';

export function generate(node) {
  return Promise.resolve('sorry, no support for Makefile creation yet - use cmake or ninja instead');
}

export function install(node) {
  return execAsync('make install', {
    cwd: node.d.project, silent: !args.quiet
  }
  );
}

export class Make extends Compiler {
  constructor(environment: Environment) {
    super(environment);
    this.name = 'make';
    this.projectFileName = 'configure';
    this.buildFileName = 'Makefile';
  }
  configureCommand(toolpaths: any) {
    const prefix = this.environment.build.prefix ? this.environment.build.prefix + ' ' : '';
    const options = combine({ prefix: this.environment.d.build }, this.environment.configure.make.flags);
    const makeArgs = jsonToFlags(options, { prefix: '--' }).join(' ');
    return `${prefix}./configure ${makeArgs}`
  }
  buildCommand(toolpaths?: string) {
    const prefix = this.environment.build.prefix ? this.environment.build.prefix + ' ' : '';
    const options = combine({ '-j': this.environment.host.cpu }, this.environment.build.arguments);
    const args = jsonToFlags(options, { prefix: '', join: '' }).join(' ');
    const command = `${prefix}make ${args}`
    return 'make -j' + this.environment.host.cpu.num;
  }
  installCommand() {
    return 'make install';
  }
}