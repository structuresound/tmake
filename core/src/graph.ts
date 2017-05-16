import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as file from 'tmake-file';
import { combine, check, Graph, OLHM, extend } from 'typed-json-transform';
import { log } from './log';
import { errors } from './errors';
import { args } from './runtime';
import { iterateOLHM, mapOLHM, iterate } from './iterate';
import { absolutePath } from './parse';
import { Runtime } from './runtime';
import { jsonStableHash } from './hash';

import { Project as ProjectConstructor, resolveName, fromString as projectFromString } from './project';

function loadCache(project: TMake.Project) {
  return new Bluebird<TMake.Project>((resolve) => {
    Runtime.Db.projectNamed(project.name)
      .then((result) => {
        if (result) {
          project.merge(<any>result);
        }
        return Bluebird.each(project.environments, (e) => {
          return loadEnvironment(e);
        });
      }).then(() => {
        resolve(project);
      })
  });
}

function loadEnvironment(env: TMake.Environment) {
  return Runtime.Db.loadEnvironment(env.hash())
    .then((result) => {
      return Bluebird.resolve(env.merge(<any>result));
    });
}

function createNode(_conf: TMake.Project.File, parent?: TMake.Project) {
  const node = new ProjectConstructor(_conf, <any>parent);
  return loadCache(<TMake.Project>node);
}

interface Cache {
  [index: string]: TMake.Project;
}

interface FileCache {
  [index: string]: TMake.Project.File;
}

function scanDependencies(require: OLHM<TMake.Project.File>, node: TMake.Project, graph: Graph<TMake.Project>,
  cache: Cache, fileCache: FileCache): PromiseLike<TMake.Project> {
  const keys = [];
  for (const k of Object.keys(require || {})) {
    keys.push(k);
  }
  return Bluebird.map(keys,
    (key) => {
      let dep: TMake.Project.File = <any>require[key]
      if (check(dep, String)) {
        dep = projectFromString(<string><any>dep);
      }
      if (!dep.name) {
        dep.name = resolveName(dep, key);
      }
      return graphNode(dep, node, graph, cache, fileCache);
    })
    .then((deps) => {
      if (deps.length) {
        node.require = {}
        for (const dep of deps) {
          node.require[dep.name] = <any>dep;
        }
      }
      return Bluebird.resolve(node);
    });
}

function graphNode(_conf: TMake.Project.File, parent: TMake.Project, graph: Graph<TMake.Project>,
  cache: Cache, fileCache: FileCache): Bluebird<TMake.Project> {
  let conf = _conf;
  if (conf.link) {
    const configDir = absolutePath(conf.link, parent ? parent.d.root : args.configDir);
    // console.log('extend config', configDir);
    if (fileCache[configDir]) {
      log.verbose(`file @ ${fileCache[configDir].dir} already loaded`);
    } else {
      const linkedConfig = file.readConfigSync(configDir);
      if (!linkedConfig) {
        throw new Error(`can't resolve symlink ${conf.link} relative to parent ${parent.dir} fullpath: ${file.getConfigPath(configDir)}`)
      }
      linkedConfig.dir = configDir;
      fileCache[configDir] = <TMake.Project.File>combine(linkedConfig, conf);
    }
    _.extend(conf, fileCache[configDir]);
  }
  if (parent && (conf.name === parent.name)) {
    throw new Error(`recursive dependency ${parent.name}`);
  }
  if (cache[conf.name]) {
    log.verbose(`project ${conf.name} already loaded`);
    return Bluebird.resolve(cache[conf.name]);
  }
  return createNode(conf, parent)
    .then((node: TMake.Project) => {
      graph.addNode(node.name);
      if (parent) {
        log.verbose(`  ${parent.name} requires ${node.name}`);
        graph.addDependency(parent.name, node.name);
      } else {
        log.verbose(`graph >> ${node.name} ${node.dir ? '@ ' + node.dir : ''}`);
      }
      cache[node.name] = node;
      return scanDependencies(conf.require, node, graph, cache, fileCache);
    }).then((node: TMake.Project) => {
      if (args.verbose) {
        log.add(`+${node.name} ${node.dir ? '@ ' + node.dir : ''}`);
      }
      return Bluebird.resolve(node);
    });
}

function _map(node: TMake.Project.File, graphType: string,
  graphArg?: string): PromiseLike<TMake.Project[]> {
  const cache: Cache = {};
  const fileCache: FileCache = {};
  const graph = new Graph();

  return graphNode(node, undefined, graph, cache, fileCache)
    .then(() => {
      const nodeNames = graph[graphType](graphArg);
      const nodes: TMake.Project[] =
        _.map(nodeNames, (name: string) => { return cache[name]; });
      return Bluebird.resolve(nodes);
    }).catch((error) => {
      const nodeNames = graph[graphType](graphArg);
      if (args.verbose){
        return Bluebird.reject(error);
      }
      return Bluebird.reject(errors.graph.failed(nodeNames, error));
    });
}

function all(node: TMake.Project | TMake.Project.File) {
  return _map(node, 'overallOrder');
}

function deps(node: TMake.Project | TMake.Project.File) {
  return _map(node, 'dependenciesOf', node.name);
}

function resolve(conf: TMake.Project | TMake.Project.File) {
  if (!conf) {
    throw new Error('resolving without a root node');
  }
  return all(conf);
}

export { deps, createNode, loadCache, resolve as graph };
