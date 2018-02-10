import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as file from './file';
import { combine, check, Graph, OLHM, extend, flatten, map } from 'typed-json-transform';
import { log } from './log';
import { errors } from './errors';
import { args, Runtime } from './runtime';
import { iterateOLHM, mapOLHM, iterate } from './iterate';
import { absolutePath } from './parse';
import { jsonStableHash } from './hash';

import { Product, fromGitString as projectFromString } from './project';

function loadCache(project: TMake.Product) {
  return new Bluebird<TMake.Product>((resolve) => {
    Runtime.Db.projectNamed(project.name)
      .then((result) => {
        if (result) {
          project.loadCache(result);
        }
        const iterable = flatten(map(project.platforms, (p) => map(p, (c) => c)));
        return Bluebird.each(iterable, (e: TMake.Configuration) => {
          return loadConfiguration(e);
        });
      }).then(() => {
        resolve(project);
      }, (e: Error) => console.log(e));
  });
}

function loadConfiguration(configuration: TMake.Configuration) {
  return Runtime.Db.loadConfiguration(configuration.hash())
    .then((result) => {
      return Bluebird.resolve(configuration.merge(<any>result));
    });
}

function createNode(_conf: TMake.Source.File, parent?: TMake.Product) {
  const node = new Product({sourceFile: _conf, parent});
  return loadCache(<TMake.Product>node);
}

interface Cache {
  [index: string]: TMake.Product;
}

interface FileCache {
  [index: string]: TMake.Source.File;
}

function scanDependencies(require: OLHM<TMake.Source.File>, node: TMake.Product, graph: Graph<TMake.Product>,
  cache: Cache, fileCache: FileCache): PromiseLike<TMake.Product> {
  const keys = [];
  for (const k of Object.keys(require || {})) {
    keys.push(k);
  }
  return Bluebird.map(keys,
    (key: string) => {
      let dep: TMake.Source.File = <any>require[key]
      if (check(dep, String)) {
        dep = {
          name: dep as any,
          project: {}
        }
      }
      if (!dep.name) {
        dep.name = Product.resolveName(dep, key);
      }
      return Runtime.Db.getPackage(dep).then((extendFile) => {
        return graphNode(dep, node, graph, cache, fileCache, extendFile);
       });
    })
    .then((deps: any) => {
      if (deps.length) {
        node.dependencies = {}
        for (const dep of deps) {
          node.dependencies[dep.parsed.name] = <any>dep;
        }
      }
      return Bluebird.resolve(node);
    });
}

function graphNode(sourceFile: TMake.Source.File, parent: TMake.Product, graph: Graph<TMake.Product>,
  cache: Cache, fileCache: FileCache, extend?: TMake.Source.File): Bluebird<TMake.Product> {
    const {project} = sourceFile;
  if (parent && (sourceFile.name === parent.name)) {
    throw new Error(`recursive dependency ${parent.name}`);
  }
  if (cache[sourceFile.name]) {
    log.verbose(`project ${sourceFile.name} already loaded`);
    return Bluebird.resolve(cache[sourceFile.name]);
  }
  if (project && project.link) {
    const configDir = absolutePath(project.link, parent ? parent.parsed.d.root : args.configDir);
    // console.log('extend config', configDir);
    if (fileCache[configDir]) {
      log.verbose(`file @ ${fileCache[configDir].project.dir} already loaded`);
    } else {
      const linkedConfig: TMake.Source.File = file.readConfigSync(configDir);
      if (!linkedConfig) {
        throw new Error(`can't resolve symlink ${project.link} relative to parent ${parent.parsed.dir} fullpath: ${file.getConfigPath(configDir)}`)
      }
      linkedConfig.project.dir = configDir;
      fileCache[configDir] = <TMake.Source.File>combine(linkedConfig, sourceFile);
    }
    _.extend(sourceFile, fileCache[configDir]);
  }
  return createNode(sourceFile, parent)
    .then((node: TMake.Product) => {
      graph.addNode(node.name);
      if (parent) {
        log.verbose(`  ${parent.name} requires ${node.name}`);
        graph.addDependency(parent.name, node.name);
      } else {
        log.verbose(`graph >> ${node.name} ${node.parsed.dir ? '@ ' + node.parsed.dir : ''}`);
      }
      cache[node.name] = node;
      return scanDependencies(sourceFile.project.require, node, graph, cache, fileCache);
    }).then((node: TMake.Product) => {
      if (args.verbose) {
        log.add(`+${node.name} ${node.parsed.dir ? '@ ' + node.parsed.dir : ''}`);
      }
      return Bluebird.resolve(node);
    });
}

function _map(node: TMake.Source.File, graphType: string,
  graphArg?: string): PromiseLike<TMake.Product[]> {
  const cache: Cache = {};
  const fileCache: FileCache = {};
  const graph = new Graph();

  return graphNode(node, undefined, graph, cache, fileCache)
    .then(() => {
      const nodeNames = graph[graphType](graphArg);
      const nodes: TMake.Product[] = _.map(nodeNames, (name: string) => { return cache[name]; });
      return Bluebird.resolve(nodes);
    }).catch((error) => {
      const nodeNames = graph[graphType](graphArg);
      if (args.verbose) {
        return Bluebird.reject(error);
      }
      return Bluebird.reject(errors.graph.failed(nodeNames, error));
    });
}

function all(node: TMake.Source.File) {
  return _map(node, 'overallOrder');
}

function deps(node: TMake.Source.File) {
  return _map(node, 'dependenciesOf', node.name);
}

function resolve(conf: TMake.Source.File) {
  if (!conf) {
    throw new Error('resolving without a root node');
  }
  return all(conf);
}

export { deps, createNode, loadCache, resolve as graph };
