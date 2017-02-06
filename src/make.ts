import * as Bluebird from 'bluebird';

import { execAsync } from './sh';
import { args } from './args';

function build(node) {
  return execAsync(`make -j ${node.j()}`, {
    cwd: node.d.project,
    silent: !args.quiet
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
