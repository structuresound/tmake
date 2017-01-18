import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as path from 'path';
import * as colors from 'chalk';
import * as fs from 'fs';
import { plain as toJSON } from 'js-object-tools';

import { linkSource, destroy as destroySource } from './fetch';
import { log } from './util/log';
import args from './util/args';
import * as file from './file';

import { prompt } from './prompt';
import { createNode, graph } from './graph';
import cloud from './cloud';
import { nodeNamed, updateNode, updateEnvironment, user as userDb, cache } from './db';

import { fetch } from './fetch';
import build from './build';
import { configure } from './configure';
import { installNode, installEnvironment, installHeaders } from './install';
import test from './test';

import { Project } from './node';
import { Environment } from './environment';

function execute(conf: ProjectFile, phase: string) {
  let root: Project;
  return graph(_.extend(conf, { d: { root: args.runDir } }))
    .then((nodes: Project[]): Promise<any> => {
      root = nodes[nodes.length - 1];
      if (!args.quiet) {
        log.add(_.map(nodes, d => d.name).join(' >> '));
      }
      if (args.nodeps) {
        return processDep(nodes[nodes.length - 1], phase);
      }
      return Promise.each(nodes, node => processDep(node, phase));
    })
    .then(() => { return Promise.resolve(root); });
}

class ProjectRunner {
  [index: string]: any;
  project: Project;
  constructor(node: Project) {
    this.project = node;
  }
  do(fn: Function, opt?: any) {
    return Promise.each(<any>this.project.environments, (env: Environment) => {
      return fn(env, opt);
    })
  }
  fetch() { return fetch(this.project); }
  configure(isTest: boolean) {
    const doConfigure = () => {
      log.quiet(`>> configure >>`);
      return this.do(configure, isTest)
        .then((): Promise<any> => { return installHeaders(this.project); });
    }
    return this.fetch().then(() => {
      return doConfigure();
    });
  }
  build(isTest?: boolean) {
    return this.configure(isTest)
      .then((): Promise<any> => {
        log.quiet(`>> build >>`);
        return this.do(build, isTest);
      });
  }
  install(): Promise<any> {
    return this.build()
      .then((): Promise<any> => {
        log.quiet(`>> install >>`);
        return installNode(this.project).then(() => {
          return this.do(installEnvironment);
        });
      });
  }
  test() { return this.build(true).then(() => test(this)); }
  link() {
    return this.install()
      .then((): Promise<any> => {
        const doc: ProjectFile = this.project.safe(true);
        const query = { name: doc.name, tag: doc.tag || 'master' };
        return userDb.update(query, { $set: doc }, { upsert: true });
      });
  }
  clean() {
    log.quiet(`cleaning ${this.project.name}`);
    log.verbose(this.project.libs);
    _.each(this.project.libs, (libFile) => {
      log.quiet(`rm ${libFile}`);
      if (fs.existsSync(libFile)) {
        fs.unlinkSync(libFile);
      }
    });
    for (const env of this.project.environments) {
      if (fs.existsSync(env.d.build)) {
        log.quiet(`rm -R ${env.d.build}`);
        file.nuke(env.d.build);
      }
      const projectModifier: ProjectModifier = {
        $unset: {
          cache: true
        }
      };
      return updateNode(this.project, projectModifier)
        .then((): Promise<any> => {
          if (env.cache.generatedBuildFilePath) {
            const filePath =
              path.join(env.d.project, env.cache.generatedBuildFilePath);
            try {
              if (fs.existsSync(filePath)) {
                log.quiet(`clean generatedBuildFile ${filePath}`);
                if (fs.lstatSync(filePath).isDirectory()) {
                  file.nuke(filePath);
                } else {
                  fs.unlinkSync(filePath);
                }
              }
            } catch (err) {
              log.error(err.message || err);
            }
            const unsetter = { $unset: { 'cache': true } };
            return updateEnvironment(env, unsetter);
          }
          return Promise.resolve();
        });
    }
  }
}

function processDep(node: Project, phase: string) {
  if (!args.quiet) {
    log.log(`<< ${node.name} >>`);
  }
  process.chdir(args.runDir);
  return new ProjectRunner(node)[phase]();
}

function unlink(config: ProjectFile) {
  const query = { name: config.name, tag: config.tag || 'master' };
  return userDb.findOne(query).then((doc: ProjectFile): Promise<any> => {
    if (doc) {
      return userDb.remove(query);
    }
    return Promise.resolve();
  });
}

function push(config: ProjectFile) {
  prompt
    .ask(colors.green(
      `push will do a clean, full build, test and if successful will upload to the ${colors.yellow('public repository')}\n${colors.yellow('do that now?')} ${colors.gray('(yy = disable this warning)')}`))
    .then((res: boolean): Promise<any> => {
      if (res) {
        return execute(config, 'install');
      }
      return Promise.reject('user aborted push command');
    })
    .then((): Promise<any> => { return nodeNamed(config.name); })
    .then((json: any): Promise<any> => {
      if (json.cache.bin || json.cache.libs) {
        return cloud.post(json).then((res) => {
          if (args.v) {
            log.quiet(`<< ${JSON.stringify(res, [], 2)}`, 'magenta');
          }
          return Promise.resolve(res);
        });
      }
      return Promise.reject(
        new Error('link failed because build or test failed'));
    });
}

function list(repo: string, selector: Object): Promise<ProjectFile[]> {
  switch (repo) {
    default:
    case 'cache':
      return cache.find(selector) as Promise<ProjectFile[]>;
    case 'user':
      return userDb.find(selector) as Promise<ProjectFile[]>;
  }
}

function parse(config: ProjectFile, aspect: string): Promise<any> {
  return createNode(config, undefined)
    .then((project): Promise<any> => {
      switch (aspect) {
        case 'node':
          log.log(project.safe());
        default:
          log.log(toJSON(project[aspect] || {}));
      }
      return Promise.resolve();
    });
}

function findAndClean(depName: string) {
  return nodeNamed(depName)
    .then((config: ProjectFile): Promise<any> => {
      if (config) {
        return createNode(config, undefined)
          .then((node): Promise<any> => {
            return new ProjectRunner(node).clean();
          })
          .then((): Promise<any> => {
            return nodeNamed(depName)
              .then((cleaned: ProjectFile) => {
                log.verbose(cleaned);
                return Promise.resolve(cleaned);
              })
          })
      }
      return Promise.reject(new Error(`didn't find project with name: ${depName}`));
    });
}

export {
  ProjectRunner,
  execute,
  list,
  parse,
  push,
  unlink,
  findAndClean,
};
