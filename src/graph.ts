import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as file from './file';
import { CacheObject, CacheProperty } from './cache';
import { combine, check, Graph, OLHM, extend } from 'typed-json-transform';
import { log } from './log';
import { errors } from './errors';
import { args } from './args';
import { iterateOLHM, mapOLHM, iterate } from './iterate';
import { absolutePath } from './parse';
import { cache as db, environmentCache } from './db';
import { jsonStableHash } from './hash';

import { Project, ProjectFile, resolveName, fromString as projectFromString } from './project';
import { Environment } from './environment';

function loadCache(project: Project): Promise<Project> {
  return db.findOne({ name: project.name })
    .then((result: ProjectFile) => {
      if (result) {
        project.merge(<any>result);
      }
      return Bluebird.each(project.environments, (e) => {
        return loadEnvironment(e);
      });
    }).then(() => {
      return Promise.resolve(project);
    })
}

function loadEnvironment(env: Environment) {
  return environmentCache(env.hash())
    .then((result) => {
      return Promise.resolve(env.merge(<any>result));
    });
}

function createNode(_conf: ProjectFile, parent?: Project) {
  const node = new Project(_conf, parent);
  return loadCache(node);
}

interface Cache {
  [index: string]: Project;
}

interface FileCache {
  [index: string]: ProjectFile;
}

function scanDependencies(require: OLHM<ProjectFile>, node: Project, graph: Graph<Project>,
  cache: Cache, fileCache: FileCache): PromiseLike<Project> {
  const keys = [];
  for (const k of Object.keys(require || {})) {
    keys.push(k);
  }
  return Bluebird.map(keys,
    (key) => {
      let dep: ProjectFile = <any>require[key]
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
      return Promise.resolve(node);
    });
}

function graphNode(_conf: ProjectFile, parent: Project, graph: Graph<Project>,
  cache: Cache, fileCache: FileCache): Promise<Project> {
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
      fileCache[configDir] = <ProjectFile>combine(linkedConfig, conf);
    }
    _.extend(conf, fileCache[configDir]);
  }
  if (parent && (conf.name === parent.name)) {
    throw new Error(`recursive dependency ${parent.name}`);
  }
  if (cache[conf.name]) {
    log.verbose(`project ${conf.name} already loaded`);
    return Promise.resolve(cache[conf.name]);
  }
  return createNode(conf, parent)
    .then((node: Project) => {
      graph.addNode(node.name);
      if (parent) {
        log.verbose(`  ${parent.name} requires ${node.name}`);
        graph.addDependency(parent.name, node.name);
      } else {
        log.verbose(`graph >> ${node.name} ${node.dir ? '@ ' + node.dir : ''}`);
      }
      cache[node.name] = node;
      return scanDependencies(conf.require, node, graph, cache, fileCache);
    }).then((node: Project) => {
      if (args.verbose) {
        log.add(`+${node.name} ${node.dir ? '@ ' + node.dir : ''}`);
      }
      return Promise.resolve(node);
    });
}

function _map(node: ProjectFile, graphType: string,
  graphArg?: string): Promise<Project[]> {
  const cache: Cache = {};
  const fileCache: FileCache = {};
  const graph = new Graph();

  return graphNode(node, undefined, graph, cache, fileCache)
    .then(() => {
      const nodeNames = graph[graphType](graphArg);
      const nodes: Project[] =
        _.map(nodeNames, (name: string) => { return cache[name]; });
      return Promise.resolve(nodes);
    }).catch((error) => {
      const nodeNames = graph[graphType](graphArg);
      return Promise.reject(errors.graph.failed(nodeNames, error));
    });
}

function all(node: Project | ProjectFile) {
  return _map(node, 'overallOrder');
}

function deps(node: Project | ProjectFile) {
  return _map(node, 'dependenciesOf', node.name);
}

function resolve(conf: Project | ProjectFile) {
  if (!conf) {
    throw new Error('resolving without a root node');
  }
  return all(conf);
}

export { deps, createNode, loadCache, resolve as graph };
