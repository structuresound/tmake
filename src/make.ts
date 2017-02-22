import * as Bluebird from 'bluebird';

import { execAsync } from './sh';
import { args } from './args';
import { log } from './log';

import { Environment } from './environment';

function build(env: Environment) {
  const prefix = env.build.prefix ? env.build.prefix + ' ' : '';
  const command = `${prefix}make -j ${env.j()}`
  log.verbose(command);
  return execAsync(command, {
    cwd: env.d.project,
    silent: !args.verbose,
    short: 'make'
  });
}

function generate(node) {
  return Promise.resolve('sorry, no support for Makefile creation yet - use cmake or ninja instead');
}

function install(node) {
  return execAsync('make install', {
    cwd: node.d.project, silent: !args.quiet
  }
  );
}

export { build, generate, install }
