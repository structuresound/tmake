import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import * as colors from 'chalk';
import * as fs from 'fs';
import * as file from './file';
import { contains, clone, map, OLHM } from 'typed-json-transform';

import { args, Args } from './runtime';
import { login, get, post } from './cloud';
import { Runtime } from './runtime';
import { Fetch } from './fetch';
import { build, configure } from './phase';
import { generate } from './generate';
import { createNode, graph } from './graph';
import { installProject, installConfiguration, installHeaders } from './install';
import { prompt } from './prompt';
import { log } from './log';
import { info } from './info';
import { errors, TMakeError } from './errors';
import { Shell } from './shell';

import test from './test';
import { Configuration } from './index';

function isSingleCommand(phase: string) {
  return contains(['parse', 'graph', 'clean'], phase);
}

function singleCommand(project: TMake.Project, phase: string, selectedDeps: TMake.Project[]) {
  switch (phase) {
    case 'clean':
      return graph(project.raw)
        .then((deps: TMake.Project[]) => {
          return <any>Bluebird.each(deps, (node: TMake.Project) => {
            return processDep(node, phase);
          });
        });
    case 'graph':
      return graph(project.raw)
        .then((deps: TMake.Project[]) => {
          if (deps) {
            if (args.verbose) {
              log.log(deps);
            } else {
              log.log(_.map(deps, (project) => project.parsed.name));
            }
          }
        });
    case 'parse':
      const aspect = args._[2];
      if (aspect) {
        log.verbose(`parse ${aspect} for project ${project.parsed.name}`);
        if (project.parsed.configurations[0][aspect]) {
          log.verbose(`aspect ${aspect} found in environment`);
          log.log(project.parsed.configurations[0][aspect]);
        }
        else if (project[aspect]) {
          log.log(project[aspect]);
        } else {
          log.error(`${aspect} not found`);
        }
      } else {
        log.log(map(project.parsed.configurations, (configuration) => configuration.parsed));
      }
      break;
  }
  return Bluebird.resolve();
}

export function execute(conf: TMake.Project.Raw, phase: string, subProject?: string) {
  let root: TMake.Project;
  return graph(conf)
    .then((deps: TMake.Project[]) => {
      let selectedDeps = deps;
      root = deps[deps.length - 1];
      if (subProject !== root.parsed.name) {
        selectedDeps = []
        let notFound = true;
        for (const project of deps) {
          selectedDeps.push(project);
          if (project.parsed.name === subProject) {
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
        log.add(_.map(selectedDeps, d => d.parsed.name).join(' >> '));
      }
      return <any>Bluebird.each(selectedDeps, (node: TMake.Project) => {
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
    return Bluebird.each(this.project.parsed.configurations, (configuration: TMake.Configuration) => {
      return fn(configuration, opt);
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
        return this.do(installConfiguration).then(() => {
          return installProject(this.project);
        });
      });
  }
  test() { return this.build(true).then(() => test(this)); }
  // link() {
  //   const root = this.project;
  //   return this.install()
  //     .then(() => {
  //       return graph(this.project).then((deps) => {
  //         return Bluebird.each(deps, (project) => {
  //           if (!project.tree) {
  //             const doc = project.toRegistry();
  //             const query = { name: doc.name, tag: doc.tag || 'master' };
  //             return Runtime.Db.link(query, { $set: doc }, { upsert: true });
  //           }
  //         })
  //       });
  //     });
  // }
  clean() {
    log.quiet(`cleaning ${this.project.parsed.name}`);
    _.each(this.project.cache.libs.value(), (libFile) => {
      log.verbose(`rm ${libFile}`);
      try {
        fs.unlinkSync(libFile);
      } catch (e) { }
      try {
        file.nuke(this.project.parsed.d.build);
      } catch (e) {

      }
    });
    return Bluebird.each(this.project.parsed.configurations, (configuration: TMake.Configuration) => {
      const hash = configuration.hash();
      log.dev('nuke', configuration.parsed.d.build)
      file.nuke(configuration.parsed.d.build);
      return Runtime.Db.cleanConfiguration(hash);
    }).then(() => {
      log.dev('nuke', this.project.parsed.d.build)
      file.nuke(this.project.parsed.d.build);
      log.verbose('clean project cache');
      return Runtime.Db.removeProject(this.project.parsed.name)
    })
  }
}

export function processDep(node: TMake.Project, phase: string) {
  if (!args.quiet) {
    log.log(`${node.parsed.name}`);
  }
  process.chdir(args.runDir);
  return new ProjectRunner(node)[phase]();
}

export function push(config: TMake.Project.Raw) {
  prompt
    .ask(colors.green(
      `push will do a clean, full build, test and if successful will upload to the ${colors.yellow('public repository')}\n${colors.yellow('do that now?')} ${colors.gray('(yy = disable this warning)')}`))
    .then((res: boolean) => {
      if (res) {
        return execute(config, 'install');
      }
      return Bluebird.reject('user aborted push command');
    })
    .then(() => { return Runtime.Db.projectNamed(config.name); })
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

export function list(repo: string, selector: any) {
  switch (repo) {
    default:
    case 'cache': return Runtime.Db.findProjects(selector) as PromiseLike<TMake.Project.Raw[]>;
  }
}

export class TMake extends Shell {
  constructor(configuration: TMake.Configuration) {
    super(configuration);
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
