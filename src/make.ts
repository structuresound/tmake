import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import { existsSync } from 'fs';
import { combine } from 'js-object-tools';
import { jsonToFlags } from './compilerFlags';

import { updateProject, updateEnvironment } from './db';
import { fileHash } from './hash';
import { log } from './log';

import { startsWith } from './string';
import { fetch } from './tools';
import { execAsync } from './sh';
import { args } from './args';
import { Environment } from './environment';
import { ensureBuildFile } from './build';


function make(env: Environment, command: string) {
  log.verbose(command);
  return execAsync(command, {
    cwd: env.d.project,
    silent: !args.verbose,
    short: 'make'
  });
}

function doConfiguration(env: Environment) {
  const prefix = env.build.prefix ? env.build.prefix + ' ' : '';
  const options = combine({ prefix: env.d.build }, env.configure.arguments);
  const args = jsonToFlags(options, { prefix: '--' }).join(' ');
  const command = `${prefix}./configure ${args}`
  return make(env, command);
}

export function configure(env: Environment) {
  const configure = path.join(env.d.project, 'configure');
  if (!existsSync(configure)) {
    return Promise.resolve()
  }
  const Makefile = path.join(env.d.project, 'Makefile');
  return fileHash(Makefile).then((buildFileHash) => {
    if (existsSync(Makefile) && env.cache.make.value() === buildFileHash) {
      return Promise.resolve();
    }
    return doConfiguration(env).then(() => {
      env.cache.make.update();
      return updateEnvironment(env);
    })
  });
}

export function build(env: Environment) {
  ensureBuildFile(env, 'make');
  const prefix = env.build.prefix ? env.build.prefix + ' ' : '';
  const options = combine({ '-j': env.j() }, env.build.arguments);
  const args = jsonToFlags(options, { prefix: '', join: '' }).join(' ');
  const command = `${prefix}make ${args}`
  return make(env, command);
}

export function generate(node) {
  return Promise.resolve('sorry, no support for Makefile creation yet - use cmake or ninja instead');
}

export function install(node) {
  return execAsync('make install', {
    cwd: node.d.project, silent: !args.quiet
  }
  );
}