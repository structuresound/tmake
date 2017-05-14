import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import * as colors from 'chalk';
import * as fs from 'fs';
import * as file from 'tmake-file';
import { contains, plain as toJSON } from 'typed-json-transform';


import { args, Args } from './runtime';
import { login, get, post } from './cloud';
import { Db } from './Db';
import { Fetch } from './fetch';
import { build } from './build';
import { configure } from './configure';
import { generate } from './generate';
import { createNode, graph } from './graph';
import { installProject, installEnvironment, installHeaders } from './install';
import { prompt } from './prompt';
import { log } from './log';
import { info } from './info';
import { errors, TMakeError } from './errors';
import { Shell } from './shell';

import test from './test';

function isSingleCommand(phase: string) {
  return contains(['parse', 'graph', 'clean'], phase);
}

function singleCommand(project: TMake.Project, phase: string, selectedDeps: TMake.Project[]) {
  switch (phase) {
    case 'clean':
      return graph(project)
        .then((deps: TMake.Project[]) => {
          return <any>Bluebird.each(deps, (node) => {
            return processDep(node, phase);
          });
        });
    case 'graph':
      return graph(project)
        .then((deps: TMake.Project[]) => {
          if (args.verbose) {
            log.log(deps);
          } else {
            log.log(_.map(deps, (project) => project.name));
          }
        });
    case 'parse':
      const aspect = args._[2];
      if (aspect) {
        log.verbose(`parse ${aspect} for project ${project.name}`);
        if (project.environments[0][aspect]) {
          log.verbose(`aspect ${aspect} found in environment`);
          log.log(project.environments[0][aspect]);
        }
        else if (project[aspect]) {
          log.log(project[aspect]);
        } else {
          log.error(`${aspect} not found`);
        }
      } else {
        log.log(project.toRegistry());
      }
      break;
  }
  return Bluebird.resolve();
}

export function execute(conf: TMake.Project.File, phase: string, subProject?: string) {
  let root: TMake.Project;
  return graph(conf)
    .then((deps: TMake.Project[]) => {
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
    .then(() => { return Bluebird.resolve(root); });
}

export class ProjectRunner {
  [index: string]: any;
  project: TMake.Project;
  constructor(node: TMake.Project) {
    this.project = node;
  }
  do(fn: Function, opt?: any) {
    return Bluebird.each(this.project.environments, (env: TMake.Environment) => {
      return fn(env, opt);
    })
  }
  fetch(isTest?: boolean) { return Fetch.project(this.project, isTest); }
  generate(isTest?: boolean) {
    return this.fetch()
      .then(() => {
        log.verbose(`  generate`);
        return this.do(generate);
      });
  }
  configure(isTest?: boolean) {
    const doConfigure = () => {
      log.verbose(`  configure`);
      return this.do(configure)
        .then(() => {
          log.verbose('install headers');
          return installHeaders(this.project);
        });
    }
    return this.generate(isTest).then(() => {
      return doConfigure();
    });
  }
  build(isTest?: boolean) {
    return this.configure(isTest)
      .then(() => {
        log.verbose(`  build`);
        return this.do(build);
      });
  }
  all() {
    return this.install();
  }
  install() {
    return this.build()
      .then(() => {
        log.verbose(`  install`);
        return this.do(installEnvironment).then(() => {
          return installProject(this.project);
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
              return Db.user.update(query, { $set: doc }, { upsert: true });
            }
          })
        });
      });
  }
  clean() {
    log.quiet(`cleaning ${this.project.name}`);
    _.each(this.project.cache.libs.value(), (libFile) => {
      log.verbose(`rm ${libFile}`);
      try {
        fs.unlinkSync(libFile);
      } catch (e) { }
      try {
        file.nuke(this.project.d.build);
      } catch (e) {

      }
    });
    return Bluebird.each(this.project.environments, (env) => {
      const hash = env.hash();
      return Db.cache.remove({ hash: hash });
    }).then(() => {
      log.verbose('clean environment caches');
      return Db.cache.remove({ project: this.project.name })
    }).then(() => {
      log.verbose('clean project cache');
      return Db.cache.remove({ name: this.project.name })
    })
  }
}

export function processDep(node: TMake.Project, phase: string) {
  if (!args.quiet) {
    log.log(`${node.name}`);
  }
  process.chdir(args.runDir);
  return new ProjectRunner(node)[phase]();
}

export function unlink(config: TMake.Project.File) {
  const query = { name: config.name, tag: config.tag || 'master' };
  return Db.user.remove(query);
  // return Db.user.findOne(query).then((doc: TMake.Project.File) => {
  //   if (doc) {

  //   }
  //   return Bluebird.resolve();
  // });
}

export function push(config: TMake.Project.File) {
  prompt
    .ask(colors.green(
      `push will do a clean, full build, test and if successful will upload to the ${colors.yellow('public repository')}\n${colors.yellow('do that now?')} ${colors.gray('(yy = disable this warning)')}`))
    .then((res: boolean) => {
      if (res) {
        return execute(config, 'install');
      }
      return Bluebird.reject('user aborted push command');
    })
    .then(() => { return Db.projectNamed(config.name); })
    .then((json: any) => {
      if (json.cache.bin || json.cache.libs) {
        return post(json).then((res) => {
          if (args.v) {
            log.quiet(`<< ${JSON.stringify(res, [], 2)}`, 'magenta');
          }
          return Bluebird.resolve(res);
        });
      }
      return Bluebird.reject(
        new Error('link failed because build or test failed'));
    });
}

export function list(repo: string, selector: Object) {
  switch (repo) {
    default:
    case 'cache':
      return Db.cache.find(selector) as PromiseLike<TMake.Project.File[]>;
    case 'user':
      return Db.user.find(selector) as PromiseLike<TMake.Project.File[]>;
  }
}

export function findAndClean(depName: string): PromiseLike<TMake.Project.File> {
  return Db.projectNamed(depName)
    .then((config: TMake.Project.File) => {
      if (config) {
        return createNode(config, undefined)
          .then((project) => {
            return new ProjectRunner(project).clean();
          })
          .then(() => {
            return Db.projectNamed(depName)
              .then((cleaned: TMake.Project.File) => {
                log.verbose('cleaned project', cleaned);
                return Bluebird.resolve(cleaned);
              })
          })
      }
      return Bluebird.reject(new Error(`didn't find project with name: ${depName}`));
    });
}

export class TMake extends Shell {
  constructor(env: TMake.Environment) {
    super(env);
    this.name = 'tmake';
    this.projectFileName = 'tmake.yaml';
  }
  configureCommand() {
    return `TMAKE_ARGS="${Args.encode()}" tmake configure`
  }
  buildCommand() {
    return `TMAKE_ARGS="${Args.encode()}" tmake build`
  }
  installCommand() {
    return `TMAKE_ARGS="${Args.encode()}" tmake install`
  }
}