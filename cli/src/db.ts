import * as Datastore from 'nedb-promise';
import * as path from 'path';
import * as fs from 'fs';
import * as Bluebird from 'bluebird';
import { apply, extend, Mongo } from 'typed-json-transform';
import { log, Environment } from 'tmake-core';

export class Db extends TMake.Db {
  static project: Datastore<TMake.Project.Cache.File> = <any>{};
  static environment: Datastore<TMake.Environment.Cache.File> = <any>{};
  static error: Datastore<TMake.Report> = <any>{};
  static init(args) {
    let dbPaths: { [index: string]: string };
    const testMode = ((process.env.NODE_ENV === 'test') || process.env.LOADED_MOCHA_OPTS);
    if (testMode) {
      dbPaths = {
        project: path.join(args.userCache, 'project.db'),
        environment: path.join(args.userCache, 'environment.db'),
        error: path.join(args.userCache, 'error.db')
      }
      try {
        Object.keys(dbPaths).forEach((key) => {
          fs.unlinkSync(dbPaths[key]);
        })
      } catch (e) { }
    } else {
      const cacheDir = path.join(args.runDir, args.cachePath);
      dbPaths = {
        project: path.join(args.userCache, 'project.db'),
        environment: path.join(args.userCache, 'environment.db'),
        error: path.join(args.userCache, 'error.db')
      }
    }
    const userDbPath: string = `${args.userCache}/packages.db`;
    Object.keys(dbPaths).forEach((key) => {
      extend(this[key], new Datastore({ filename: dbPaths[key], autoload: true }));
    })
  }

  static insertProject(project: TMake.Project.Cache.File) {
    return this.project.update({ name: project.name }, { $set: project }, { upsert: true });
  }
  static projectNamed(name: string): PromiseLike<TMake.Project> {
    return this.project.findOne({ name: name });
  }
  static findProjects(query: string) {
    return this.project.find({ name: name });
  }
  static updateProject(node: TMake.Project, modifier: Mongo.Modifier) {
    return this.project.update({ name: node.name }, modifier, { upsert: true });
  }
  static removeProject(name: string, version: string) {
    return this.project.remove({ name, version });
  }
  static loadEnvironment(hash: string) {
    return this.environment.findOne({ _id: hash });
  }
  static cacheEnvironment(doc: TMake.Environment.Cache.File) {
    return this.loadEnvironment(doc._id).then((res) => {
      if (res) {
        return this.environment.update(doc._id, { $set: doc }, { upsert: true }).then(() => Bluebird.resolve(res._id));
      }
      return this.environment.insert(doc);
    })
  }
  static clearEnvironment(hash: string): PromiseLike<boolean> {
    return this.environment.remove({ _id: hash });
  }

  static insertReport(report: TMake.Report) {
    return this.error.insert(report);
  }

  static reset() {
  }
}