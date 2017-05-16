import * as Datastore from 'nedb-promise';
import { join } from 'path';
import * as fs from 'fs';
import * as Bluebird from 'bluebird';
import { okmap, apply, extend, Mongo } from 'typed-json-transform';
import { log, Environment, args } from 'tmake-core';

interface Collections {
  project: Datastore<TMake.Project.Cache.File>;
  environment: Datastore<TMake.Environment.Cache.File>;
  error: Datastore<TMake.Report>;
}

export class Database implements TMake.Database.Interface {
  collections: Collections;

  constructor() {
    const cacheDir = join(args.runDir, args.cachePath);

    const dbPaths = {
      project: join(cacheDir, 'project.db'),
      environment: join(cacheDir, 'environment.db'),
      error: join(cacheDir, 'error.db')
    }

    const testMode = ((process.env.NODE_ENV === 'test') || process.env.LOADED_MOCHA_OPTS);
    if (testMode) {
      try {
        Object.keys(dbPaths).forEach((key) => {
          fs.unlinkSync(dbPaths[key]);
        })
      } catch (e) { }
    }

    this.collections = <any>okmap(dbPaths, (val, key) => {
      return { [key]: new Datastore({ filename: val, autoload: true }) };
    })
  }

  insertProject(project: TMake.Project.Cache.File) {
    return this.collections.project.update({ name: project.name }, { $set: project }, { upsert: true });
  }
  projectNamed(name: string): PromiseLike<TMake.Project> {
    return this.collections.project.findOne({ name: name });
  }
  findProjects(query: string) {
    return this.collections.project.find({ name: name });
  }
  updateProject(node: TMake.Project, modifier: Mongo.Modifier) {
    return this.collections.project.update({ name: node.name }, modifier, { upsert: true });
  }
  removeProject(name: string, version?: string) {
    if (version) {
      return this.collections.project.remove({ name, version });
    }
    return this.collections.project.remove({ name });
  }
  loadEnvironment(hash: string) {
    return this.collections.environment.findOne({ _id: hash });
  }
  cacheEnvironment(doc: TMake.Environment.Cache.File) {
    return this.loadEnvironment(doc._id).then((res) => {
      if (res) {
        return this.collections.environment.update(doc._id, { $set: doc }, { upsert: true }).then(() => Bluebird.resolve(res._id));
      }
      return this.collections.environment.insert(doc);
    })
  }
  cleanEnvironments(projectName: string): PromiseLike<boolean> {
    return this.collections.environment.remove({ project: projectName });
  }
  cleanEnvironment(hash: string): PromiseLike<boolean> {
    return this.collections.environment.remove({ _id: hash });
  }

  insertReport(report: TMake.Report) {
    return this.collections.error.insert(report);
  }
  getReports() {
    return this.collections.error.find();
  }

  reset() {
  }
}