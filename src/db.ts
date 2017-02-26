import * as Datastore from 'nedb-promise';
import * as path from 'path';
import * as fs from 'fs';
import { apply } from 'js-object-tools';

import { args } from './args';
import { log } from './log';
import { mkdir } from './sh';

import { Project, ProjectModifier } from './project'
import { Environment, EnvironmentCacheFile, EnvironmentModifier } from './environment'

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

export const cache = new Datastore({ filename: cacheDbPath, autoload: testMode });
export const user = new Datastore({ filename: userDbPath, autoload: testMode });

export function projectNamed(name: string): PromiseLike<Project> {
  return cache.findOne({ name: name });
}

export function environmentCache(hash: string): PromiseLike<EnvironmentCacheFile> {
  return cache.findOne({ hash: hash });
}

export function updateProject(node: Project, modifier: ProjectModifier) {
  return cache.update({ name: node.name }, modifier, { upsert: true });
}

export function updateEnvironment(env: Environment) {
  const envCache = env.toCache();
  return environmentCache(envCache.hash).then((res) => {
    if (res) {
      return cache.update({ hash: envCache.hash }, { $set: envCache }, { upsert: true });
    }
    return cache.insert(envCache);
  }).then(() => Promise.resolve());
}