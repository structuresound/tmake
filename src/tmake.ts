import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import * as colors from 'chalk';
import * as fs from 'fs';
import { plain as toJSON, safeOLHM } from 'js-object-tools';

import { linkSource, destroy as destroySource } from './fetch';
import { log } from './log';
import { args } from './args';
import * as file from './file';

import { prompt } from './prompt';
import { createNode, graph } from './graph';
import { login, get, post } from './cloud';
import { nodeNamed, updateNode, updateEnvironment, user as userDb, cache } from './db';

import { fetch } from './fetch';
import { build } from './build';
import { configure } from './configure';
import { installProject, installEnvironment, installHeaders } from './install';
import test from './test';

import { Project, ProjectFile, ProjectModifier, resolveName } from './project';
import { Environment } from './environment';

function execute(conf: ProjectFile, phase: string) {
  let root: Project;
  return graph(_.extend(conf, { d: { root: args.runDir } }))
    .then((nodes: Project[]) => {
      root = nodes[nodes.length - 1];
      if (!args.quiet) {
        log.add(_.map(nodes, d => d.name).join(' >> '));
      }
      if (args.nodeps) {
        return processDep(nodes[nodes.length - 1], phase);
      }
      return <any>Bluebird.each(nodes, (node) => {
        return processDep(node, phase);
      });
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
    return Bluebird.each(this.project.environments, (env: Environment) => {
      return fn(env, opt);
    })
  }
  fetch() { return fetch(this.project); }
  configure(isTest?: boolean) {
    const doConfigure = () => {
      log.quiet(`>> configure >>`);
      return this.do(configure, isTest)
        .then(() => { return installHeaders(this.project); });
    }
    return this.fetch().then(() => {
      return doConfigure();
    });
  }
  build(isTest?: boolean) {
    return this.configure(isTest)
      .then(() => {
        log.quiet(`>> build >>`);
        return this.do(build, isTest);
      });
  }
  install() {
    return this.build()
      .then(() => {
        log.quiet(`>> install >>`);
        return installProject(this.project).then(() => {
          return this.do(installEnvironment);
        });
      });
  }
  test() { return this.build(true).then(() => test(this)); }
  link() {
    const root = this.project;
    return this.install()
      .then(() => {
        return graph(this.project).then((deps) => {
          return Bluebird.each(deps, (project) => {
            if (!project.tree) {
              const doc = project.toRegistry();
              const query = { name: doc.name, tag: doc.tag || 'master' };
              log.log('pushing link', project.hash(), doc);
              return userDb.update(query, { $set: doc }, { upsert: true });
            }
          })
        });
      });
  }
  clean() {
    log.quiet(`cleaning ${this.project.name}`);
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
        $set: {
          cache: {}
        }
      };
      return updateNode(this.project, projectModifier)
        .then(() => {
          if (env.cache.generatedBuildFilePath.value()) {
            const filePath =
              path.join(env.d.project, env.cache.generatedBuildFilePath.value());
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
            const unsetter = { $set: { 'cache': {} } };
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
  return userDb.findOne(query).then((doc: ProjectFile) => {
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
    .then((res: boolean) => {
      if (res) {
        return execute(config, 'install');
      }
      return Promise.reject('user aborted push command');
    })
    .then(() => { return nodeNamed(config.name); })
    .then((json: any) => {
      if (json.cache.bin || json.cache.libs) {
        return post(json).then((res) => {
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

function list(repo: string, selector: Object) {
  switch (repo) {
    default:
    case 'cache':
      return cache.find(selector) as Promise<ProjectFile[]>;
    case 'user':
      return userDb.find(selector) as Promise<ProjectFile[]>;
  }
}

function parse(config: ProjectFile, aspect: string) {
  return createNode(config, undefined)
    .then((project) => {
      switch (aspect) {
        case 'node':
          log.log(project.toRegistry());
        default:
          log.log(toJSON(project[aspect] || {}));
      }
      return Promise.resolve();
    });
}

function findAndClean(depName: string): PromiseLike<ProjectFile> {
  return nodeNamed(depName)
    .then((config: ProjectFile) => {
      if (config) {
        return createNode(config, undefined)
          .then((project) => {
            return new ProjectRunner(project).clean();
          })
          .then(() => {
            return nodeNamed(depName)
              .then((cleaned: ProjectFile) => {
                log.verbose('cleaned project', cleaned);
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
