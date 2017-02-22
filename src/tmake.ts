import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import * as colors from 'chalk';
import * as fs from 'fs';
import { contains, plain as toJSON, safeOLHM } from 'js-object-tools';

import { args } from './args';
import { build } from './build';
import { login, get, post } from './cloud';
import { configure } from './configure';
import {
  projectNamed, updateProject, updateEnvironment,
  user as userDb, cache
} from './db';
import { Environment } from './environment';
import { fetch, linkSource, destroy as destroySource } from './fetch';
import * as file from './file';
import { createNode, graph } from './graph';
import { installProject, installEnvironment, installHeaders } from './install';
import { Project, ProjectFile, ProjectModifier, resolveName } from './project';
import { prompt } from './prompt';
import { log } from './log';
import { info } from './info';
import { errors } from './errors';

import test from './test';

function isSingleCommand(phase: string) {
  return contains(['parse', 'graph'], phase);
}

function singleCommand(project: Project, phase: string, selectedDeps: Project[]) {
  switch (phase) {
    case 'graph':
      if (args.verbose) {
        log.log(selectedDeps);
      } else {
        log.log(_.map(selectedDeps, (project) => project.name));
      }
      break;
    case 'parse':
      const aspect = args._[2];
      if (aspect) {
        log.verbose(`parse ${aspect} for project ${project.name}`);
        if (project[aspect]) {
          log.log(project[aspect]);
        } else if (project.environments[0][aspect]) {
          log.verbose(`aspect ${aspect} found in environment`);
          log.log(project.environments[0][aspect]);
        } else {
          log.error(`${aspect} not found`);
        }
      } else {
        log.log(project.toRegistry());
      }
      break;
  }
  return Promise.resolve();
}

function execute(conf: ProjectFile, phase: string, subProject?: string) {
  let root: Project;
  return graph(_.extend(conf, { d: { root: args.runDir } }))
    .then((deps: Project[]) => {
      let selectedDeps = deps;
      root = deps[deps.length - 1];
      if (subProject !== root.name) {
        selectedDeps = []
        let notFound = true;
        for (const project of deps) {
          selectedDeps.push(project);
          if (project.name === subProject) {
            root = project;
            log.warn(`restrict to submodule: ${subProject}`);
            notFound = false;
            break;
          }
        }
        if (notFound) {
          errors.project.notFound(subProject, deps);
        }
      }
      if (isSingleCommand(phase)) {
        return singleCommand(root, phase, selectedDeps);
      }
      if (args.noDeps) {
        return processDep(root, phase);
      }
      if (!args.quiet) {
        log.add(_.map(selectedDeps, d => d.name).join(' >> '));
      }
      return <any>Bluebird.each(selectedDeps, (node) => {
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
      log.verbose(`  configure`);
      return this.do(configure, isTest)
        .then(() => {
          log.verbose('install headers');
          return installHeaders(this.project);
        });
    }
    return this.fetch().then(() => {
      return doConfigure();
    });
  }
  build(isTest?: boolean) {
    return this.configure(isTest)
      .then(() => {
        log.verbose(`  build`);
        return this.do(build, isTest);
      });
  }
  all() {
    return this.install();
  }
  install() {
    return this.build()
      .then(() => {
        log.verbose(`  install`);
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
              return userDb.update(query, { $set: doc }, { upsert: true });
            }
          })
        });
      });
  }
  clean() {
    log.quiet(`cleaning ${this.project.name}`);
    _.each(this.project.cache.libs.value(), (libFile) => {
      log.verbose(`rm ${libFile}`);
      if (fs.existsSync(libFile)) {
        fs.unlinkSync(libFile);
      }
    });
    return Bluebird.each(this.project.environments, (env) => {
      if (fs.existsSync(env.d.build)) {
        log.verbose(`rm -R ${env.d.build}`);
        file.nuke(env.d.build);
      }
      if (env.cache.generatedBuildFilePath.value()) {
        const filePath =
          path.join(env.d.project, env.cache.generatedBuildFilePath.value());
        try {
          if (fs.existsSync(filePath)) {
            log.verbose(`clean generatedBuildFile ${filePath}`);
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
        const hash = env.hash();
        return cache.remove({ hash: hash });
      }
    }).then(() => {
      log.verbose('clean environment caches');
      return cache.remove({ project: this.project.name })
    }).then(() => {
      log.verbose('clean project cache');
      return cache.remove({ name: this.project.name })
    })
  }
}

function processDep(node: Project, phase: string) {
  if (!args.quiet) {
    log.log(`${node.name}`);
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
    .then(() => { return projectNamed(config.name); })
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

function findAndClean(depName: string): PromiseLike<ProjectFile> {
  return projectNamed(depName)
    .then((config: ProjectFile) => {
      if (config) {
        return createNode(config, undefined)
          .then((project) => {
            return new ProjectRunner(project).clean();
          })
          .then(() => {
            return projectNamed(depName)
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
  push,
  unlink,
  findAndClean,
};
