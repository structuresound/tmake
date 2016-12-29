import * as Datastore from 'nedb-promise';
import * as path from 'path';
import * as fs from 'fs';
import {diff} from 'js-object-tools';

import args from './util/args';
import log from './util/log';
import {mkdir} from './util/sh';

import {Node} from './node';

interface $Set {
  libs?: string[];

  'cache.configuration'?: string;
  'cache.metaConfiguration'?: string;
  'cache.url'?: string;
  'cache.libs'?: string;
  'cache.bin'?: string;
  'cache.assets'?: string[];
  'cache.buildFile'?: string;
  'cache.generatedBuildFile'?: string;
  'cache.installed'?: boolean;

  'cache.debug.url'?: string;
  'cache.debug.metaConfiguration'?: any;
}

interface $Unset {
  libs?: boolean;
  cache?: boolean;
  'cache.configuration'?: boolean;
  'cache.metaConfiguration'?: boolean;
  'cache.url'?: boolean;
  'cache.libs'?: boolean;
  'cache.bin'?: boolean;
  'cache.assets'?: boolean;
  'cache.buildFile'?: boolean;
  'cache.generatedBuildFile'?: boolean;
  'cache.installed'?: boolean;

  'cache.debug.url'?: boolean;
  'cache.debug.metaConfiguration'?: boolean;
}

interface NodeModifier {
  [index: string]: any;

  $set?: $Set;
  $unset?: $Unset;
}

let cacheDbPath: string;

const testMode =
    ((process.env.NODE_ENV === 'test') || process.env.LOADED_MOCHA_OPTS);
if (testMode) {
  cacheDbPath = path.join(args.userCache, 'cache.db');
  if (fs.existsSync(cacheDbPath)) {
    fs.unlinkSync(cacheDbPath);
  }
} else {
  const cacheDir = path.join(args.runDir, args.cachePath);
  cacheDbPath = path.join(cacheDir, 'cache.db');
}

const userDbPath: string = `${args.userCache}/packages.db`;

const cache = new Datastore({filename: cacheDbPath, autoload: testMode});
const user = new Datastore({filename: userDbPath, autoload: testMode});

function updateNode(node: Node, modifier: NodeModifier) {
  diff.apply(node, modifier);
  return cache.update({name: node.name}, modifier, {});
}

export {cache, user, updateNode, NodeModifier};
