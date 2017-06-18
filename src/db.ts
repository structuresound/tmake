import * as Datastore from 'nedb-promise';
import { join } from 'path';
import * as fs from 'fs';
import * as Bluebird from 'bluebird';
import { okmap, apply, extend, Mongo } from 'typed-json-transform';
import { log, Configuration, args } from 'tmake-core';

interface Collections {
  project: Datastore<TMake.Project.Cache.File>;
  environment: Datastore<TMake.Configuration.Cache.File>;
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
    console.log('insert project', project);
    return this.collections.project.update({ name: project.name }, { $set: project }, { upsert: true });
  }
  projectNamed(name: string): PromiseLike<TMake.Project> {
    return this.collections.project.findOne({ name: name });
  }
  findProjects(query: string) {
    return this.collections.project.find({ name: name });
  }
  updateProject(project: TMake.Project, modifier: Mongo.Modifier) {
    console.log('update project', modifier);
    return this.collections.project.update({ name: project.post.name }, modifier);
  }
  removeProject(name: string, version?: string) {
    if (version) {
      return this.collections.project.remove({ name, version });
    }
    return this.collections.project.remove({ name });
  }
  loadConfiguration(hash: string) {
    return this.collections.environment.findOne({ _id: hash });
  }
  cacheConfiguration(doc: TMake.Configuration.Cache.File) {
    return this.loadConfiguration(doc._id).then((res) => {
      if (res) {
        return this.collections.environment.update({ _id: res._id }, { $set: doc })
          .then(() => Bluebird.resolve(res._id));
      }
      return this.collections.environment.insert(doc);
    })
  }
  cleanConfigurations(projectName: string): PromiseLike<boolean> {
    return this.collections.environment.remove({ project: projectName });
  }
  cleanConfiguration(hash: string): PromiseLike<boolean> {
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