import * as Datastore from 'nedb-promise';
import * as path from 'path';
import * as fs from 'fs';
import { apply } from 'js-object-tools';

import { args } from './args';
import { log } from './log';
import { mkdir } from './sh';

import { Project, ProjectModifier } from './project'
import { Environment, EnvironmentModifier } from './environment'


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

const cache = new Datastore({ filename: cacheDbPath, autoload: testMode });
const user = new Datastore({ filename: userDbPath, autoload: testMode });

function nodeNamed(name: string) {
  return cache.findOne({ name: name });
}

function environmentWithId(name: string) {
  return cache.findOne({ name: name });
}

function updateNode(node: Project, modifier: ProjectModifier) {
  return cache.update({ name: node.name }, modifier, {});
}

function updateEnvironment(env: Environment, modifier: EnvironmentModifier) {
  return cache.update({ _id: env.id() }, modifier, { upsert: true });
}

export { nodeNamed, environmentWithId, user, cache, updateNode, updateEnvironment };
