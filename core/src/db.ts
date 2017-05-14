import * as Datastore from 'nedb-promise';
import * as path from 'path';
import * as fs from 'fs';
import * as Bluebird from 'bluebird';
import { apply, extend, Mongo } from 'typed-json-transform';
import { log } from './log';
import { mkdir } from 'shelljs';
import { Environment } from './environment';


export namespace Db {
  export const cache: Datastore = <any>{};
  export const user: Datastore = <any>{}

  export function init(args) {
    let cacheDbPath: string;
    const testMode = ((process.env.NODE_ENV === 'test') || process.env.LOADED_MOCHA_OPTS);
    if (testMode) {
      cacheDbPath = path.join(args.userCache, 'cache.db');
      try {
        fs.unlinkSync(cacheDbPath);
      } catch (e) { }
    } else {
      const cacheDir = path.join(args.runDir, args.cachePath);
      cacheDbPath = path.join(cacheDir, 'cache.db');
    }

    const userDbPath: string = `${args.userCache}/packages.db`;

    extend(cache, new Datastore({ filename: cacheDbPath, autoload: testMode }));
    extend(user, new Datastore({ filename: userDbPath, autoload: testMode }));
  }

  export function projectNamed(name: string): PromiseLike<TMake.Project> {
    return cache.findOne({ name: name });
  }

  export function environmentCache(hash: string): PromiseLike<TMake.Project.Cache.File> {
    return cache.findOne({ hash: hash });
  }

  export function updateProject(node: TMake.Project, modifier: Mongo.Modifier) {
    return cache.update({ name: node.name }, modifier, { upsert: true });
  }

  export function updateEnvironment(env: Environment) {
    const envCache = env.toCache();
    return environmentCache(envCache.hash).then((res) => {
      if (res) {
        return cache.update({ hash: envCache.hash }, { $set: envCache }, { upsert: true });
      }
      return cache.insert(envCache);
    }).then(() => Bluebird.resolve());
  }
}