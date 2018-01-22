/// <reference path="../interfaces/db.d.ts" />

import { Collections } from 'tmake-cli/db';

import * as Datastore from 'nedb-promise';
import { join } from 'path';
import * as fs from 'fs';
import * as Bluebird from 'bluebird';
import { okmap, apply, extend, Mongo } from 'typed-json-transform';
import { log, args } from 'tmake-core';

export class Database implements TMake.Database.Interface {
  collections: Collections;

  insertProject(project: TMake.Project.Cache.File) {
    console.log('insert project', project);
    return this.collections.projects.update({ name: project.name }, { $set: project }, { upsert: true });
  }
  projectNamed(name: string): PromiseLike<TMake.Project.Cache.File> {
    return this.collections.projects.findOne({ name: name });
  }
  findProjects(query: string) {
    return this.collections.projects.find({ name: name });
  }
  updateProject(project: TMake.Project, modifier: Mongo.Modifier) {
    console.log('update project', modifier);
    return this.collections.projects.update({ name: project.parsed.name }, modifier);
  }
  removeProject(name: string, version?: string) {
    if (version) {
      return this.collections.projects.remove({ name, version });
    }
    return this.collections.projects.remove({ name });
  }
  loadConfiguration(hash: string) {
    return this.collections.configurations.findOne({ _id: hash });
  }
  cacheConfiguration(doc: TMake.Configuration.Cache.File) {
    return this.loadConfiguration(doc._id)
      .then((res) => {
        if (res) {
          return this.collections.configurations.update({ _id: res._id }, { $set: doc })
        }
        return this.collections.configurations.insert(doc)
      }).then((res) => Bluebird.resolve(res._id));
  }
  cleanConfigurations(projectName: string): PromiseLike<any> {
    return this.collections.configurations.remove({ project: projectName });
  }
  cleanConfiguration(hash: string): PromiseLike<any> {
    return this.collections.configurations.remove({ _id: hash });
  }

  insertReport(report: TMake.Report) {
    return this.collections.errors.insert(report);
  }
  getReports() {
    return this.collections.errors.find({});
  }

  reset() {
  }
}

export class ClientDb extends Database {
  constructor() {
    super();

    const cacheDir = join(args.runDir, args.cachePath);

    const dbPaths = {
      projects: join(cacheDir, 'projects.json'),
      configurations: join(cacheDir, 'configurations.json'),
      errors: join(cacheDir, 'errors.json')
    }

    const testMode = ((process.env.NODE_ENV === 'test') || process.env.LOADED_MOCHA_OPTS);
    if (testMode) {
      try {
        Object.keys(dbPaths).forEach((key) => {
          fs.unlinkSync(dbPaths[key]);
        })
      } catch (e) { }
    }

    this.collections = <any>okmap(dbPaths, (val: string, key) => {
      return new Datastore({ filename: val, autoload: true });
    })
  }
}
