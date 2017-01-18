/// <reference path="./node.d.ts" /> 

import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as file from './file';
import { combine, check, NodeGraph } from 'js-object-tools';
import { log } from './util/log';
import args from './util/args';
import { iterateOLHM, mapOLHM, iterate } from './iterate';
import { absolutePath } from './parse';
import { cache as db } from './db';
import { jsonStableHash } from './util/hash';

import { Project } from './node';
import { Environment, EnvironmentCache, CacheProperty } from './environment';

function loadCache(project: Project): Promise<Project> {
  return db.findOne({ name: project.name })
    .then((result: ProjectFile) => {
      if (result) {
        project.merge(<any>result);
      }
      return Promise.each(project.environments, (e) => {
        return loadEnvironment(e);
      }).then(() => {
        return Promise.resolve(project);
      })
    });
}

function loadEnvironment(env: Environment): Promise<any> {
  return db.findOne({ name: env.id() })
    .then((result: EnvironmentCacheFile) => {
      env.cache = new EnvironmentCache();
      env.cache.configure = new CacheProperty(() => {
        return jsonStableHash(env.configure);
      })
    });
}

function createNode(_conf: ProjectFile, parent?: Project): Promise<Project> {
  const node = new Project(_conf, parent);
  return loadCache(node);
}

interface Cache {
  [index: string]: Project;
}


function graphNode(_conf: ProjectFile, parent: Project, graph: NodeGraph<Project>,
  cache: Cache): Promise<Project> {
  let conf = _conf;
  if (conf.link) {
    const configDir = absolutePath(conf.link, parent ? parent.dir : '');
    const linkedConfig = file.readConfigSync(configDir);
    linkedConfig.dir = configDir;
    if (!linkedConfig) {
      throw new Error(`can't resolve symlink ${conf.link} relative to parent ${parent.dir} fullpath: ${file.getConfigPath(configDir)}`)
    }
    conf = <ProjectFile>combine(linkedConfig, conf);
  }
  return createNode(conf, parent)
    .then((node: Project) => {
      if (parent && (node.name === parent.name)) {
        throw new Error(`recursive dependency ${parent.name}`);
      }
      graph.addNode(node.name);
      if (parent) {
        graph.addDependency(parent.name, node.name);
      }
      cache[node.name] = node;
      if (args.verbose) {
        log.add(`+${node.name}`);
        if (node.dir) {
          log.warn('@', node.dir);
        }
      }
      return mapOLHM(conf.deps,
        (dep: ProjectFile) => {
          if (dep) {
            return graphNode(dep, node, graph, cache);
          }
        })
        .then((deps) => {
          if (deps.length && deps[0] != undefined) {
            node.deps = <any>deps;
          }
          return Promise.resolve(node);
        });
    });
}

function _map(node: ProjectFile, graphType: string,
  graphArg?: string): Promise<Project[]> {
  const cache: Cache = {};
  const graph = new NodeGraph();

  return graphNode(node, undefined, graph, cache)
    .then(() => {
      const nodeNames = graph[graphType](graphArg);
      const nodes: Project[] =
        _.map(nodeNames, (name: string) => { return cache[name]; });
      return Promise.resolve(nodes);
    });
}

function all(node: ProjectFile) {
  return _map(node, 'overallOrder');
}

function deps(node: ProjectFile) {
  return _map(node, 'dependenciesOf', node.name);
}

function resolve(conf: ProjectFile) {
  if (!conf) {
    throw new Error('resolving without a root node');
  }
  return all(conf);
}

export { deps, createNode, loadCache, resolve as graph };
