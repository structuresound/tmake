import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as file from './file';
import { combine, check, Graph, OLHM, extend } from 'typed-json-transform';
import { log } from './log';
import { errors } from './errors';
import { args } from './runtime';
import { iterateOLHM, mapOLHM, iterate } from './iterate';
import { absolutePath } from './parse';
import { Runtime } from './runtime';
import { jsonStableHash } from './hash';

import { Project, fromString as projectFromString } from './project';

function loadCache(project: TMake.Project) {
  return new Bluebird<TMake.Project>((resolve) => {
    Runtime.Db.projectNamed(project.post.name)
      .then((result) => {
        if (result) {
          project.merge(<any>result);
        }
        return Bluebird.each(project.post.configurations, (e) => {
          return loadConfiguration(e);
        });
      }).then(() => {
        resolve(project);
      })
  });
}

function loadConfiguration(configuration: TMake.Configuration) {
  return Runtime.Db.loadConfiguration(configuration.hash())
    .then((result) => {
      return Bluebird.resolve(configuration.merge(<any>result));
    });
}

function createNode(_conf: TMake.Project.Pre, parent?: TMake.Project) {
  const node = new Project(_conf, <any>parent);
  return loadCache(<TMake.Project>node);
}

interface Cache {
  [index: string]: TMake.Project;
}

interface FileCache {
  [index: string]: TMake.Project.Pre;
}

function scanDependencies(require: OLHM<TMake.Project.Pre>, node: TMake.Project, graph: Graph<TMake.Project>,
  cache: Cache, fileCache: FileCache): PromiseLike<TMake.Project> {
  const keys = [];
  for (const k of Object.keys(require || {})) {
    keys.push(k);
  }
  return Bluebird.map(keys,
    (key) => {
      let dep: TMake.Project.Pre = <any>require[key]
      if (check(dep, String)) {
        dep = projectFromString(<string><any>dep);
      }
      if (!dep.name) {
        dep.name = Project.resolveName(dep, key);
      }
      return graphNode(dep, node, graph, cache, fileCache);
    })
    .then((deps) => {
      if (deps.length) {
        node.post.require = {}
        for (const dep of deps) {
          node.post.require[dep.post.name] = <any>dep;
        }
      }
      return Bluebird.resolve(node);
    });
}

function graphNode(conf: TMake.Project.Pre, parent: TMake.Project, graph: Graph<TMake.Project>,
  cache: Cache, fileCache: FileCache): Bluebird<TMake.Project> {
  if (conf.link) {
    const configDir = absolutePath(conf.link, parent ? parent.post.d.root : args.configDir);
    // console.log('extend config', configDir);
    if (fileCache[configDir]) {
      log.verbose(`file @ ${fileCache[configDir].dir} already loaded`);
    } else {
      const linkedConfig: TMake.Project.Pre = file.readConfigSync(configDir);
      if (!linkedConfig) {
        throw new Error(`can't resolve symlink ${conf.link} relative to parent ${parent.post.dir} fullpath: ${file.getConfigPath(configDir)}`)
      }
      linkedConfig.dir = configDir;
      fileCache[configDir] = <TMake.Project.Pre>combine(linkedConfig, conf);
    }
    _.extend(conf, fileCache[configDir]);
  }
  if (parent && (conf.name === parent.post.name)) {
    throw new Error(`recursive dependency ${parent.post.name}`);
  }
  if (cache[conf.name]) {
    log.verbose(`project ${conf.name} already loaded`);
    return Bluebird.resolve(cache[conf.name]);
  }
  return createNode(conf, parent)
    .then((node: TMake.Project) => {
      graph.addNode(node.post.name);
      if (parent) {
        log.verbose(`  ${parent.post.name} requires ${node.post.name}`);
        graph.addDependency(parent.post.name, node.post.name);
      } else {
        log.verbose(`graph >> ${node.post.name} ${node.post.dir ? '@ ' + node.post.dir : ''}`);
      }
      cache[node.post.name] = node;
      return scanDependencies(conf.require, node, graph, cache, fileCache);
    }).then((node: TMake.Project) => {
      if (args.verbose) {
        log.add(`+${node.post.name} ${node.post.dir ? '@ ' + node.post.dir : ''}`);
      }
      return Bluebird.resolve(node);
    });
}

function _map(node: TMake.Project.Pre, graphType: string,
  graphArg?: string): PromiseLike<TMake.Project[]> {
  const cache: Cache = {};
  const fileCache: FileCache = {};
  const graph = new Graph();

  return graphNode(node, undefined, graph, cache, fileCache)
    .then(() => {
      const nodeNames = graph[graphType](graphArg);
      const nodes: TMake.Project[] = _.map(nodeNames, (name: string) => { return cache[name]; });
      return Bluebird.resolve(nodes);
    }).catch((error) => {
      const nodeNames = graph[graphType](graphArg);
      if (args.verbose) {
        return Bluebird.reject(error);
      }
      return Bluebird.reject(errors.graph.failed(nodeNames, error));
    });
}

function all(node: TMake.Project.Pre) {
  return _map(node, 'overallOrder');
}

function deps(node: TMake.Project.Pre) {
  return _map(node, 'dependenciesOf', node.name);
}

function resolve(conf: TMake.Project.Pre) {
  if (!conf) {
    throw new Error('resolving without a root node');
  }
  return all(conf);
}

export { deps, createNode, loadCache, resolve as graph };