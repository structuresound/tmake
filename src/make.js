import * as Promise from 'bluebird';

import {execAsync} from './util/sh';
import args from './util/args';

function build(node) {
  return execAsync(`make -j ${node.j()}`, node.d.project, !args.quiet);
}

function generate(node) {
  return Promise.resolve('sorry, no support for Makefile creation yet - use cmake or ninja instead');
}

function install(node) {
  return execAsync('make install', node.d.project, !args.quiet);
}

export {build, generate, install}
