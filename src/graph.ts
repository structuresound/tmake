import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as file from './util/file';
import { DepGraph } from 'dependency-graph';
import { diff, check } from 'js-object-tools';
import log from './util/log';
import args from './util/args';
import { iterable } from './iterate';
import { absolutePath } from './parse';
import { cache as db } from './db';
import { Node } from './node';

function loadCache(node: Node): Promise<Node> {
  return db.findOne({ name: node.name })
    .then((result: file.Configuration) => {
      const existing = result || { cache: { debug: {}, test: {} } };
      node.merge(<any>existing);
      return Promise.resolve(node);
    });
}

function createNode(_conf: file.Configuration, parent?: Node): Promise<Node> {
  const node = new Node(_conf, parent);
  return loadCache(node);
}

interface Cache {
  [index: string]: Node;
}


function graphNode(_conf: file.Configuration, parent: Node, graph: DepGraph,
  cache: Cache): Promise<Node> {
  let conf = _conf;
  if (conf.link) {
    const configDir = absolutePath(conf.link, parent ? parent.dir : '');
    const linkedConfig = file.readConfigSync(configDir);
    linkedConfig.dir = configDir;
    if (!linkedConfig) {
      throw new Error(`can't resolve symlink ${conf.link} relative to parent ${parent.dir} fullpath: ${file.getConfigPath(configDir)}`)
    }
    conf = <file.Configuration>diff.combine(linkedConfig, conf);
  }
  return createNode(conf, parent)
    .then((node: Node) => {
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
      return Promise.map(iterable(conf.deps) || [],
        (dep: file.Configuration) => {
          if (dep) {
            return graphNode(dep, node, graph, cache);
          }
        })
        .then((deps) => {
          if (deps.length && deps[0] != undefined) {
            node.deps = deps;
          }
          return Promise.resolve(node);
        });
    });
}

function _map(node: file.Configuration, graphType: string,
  graphArg?: string): Promise<Node[]> {
  const cache: Cache = {};
  const graph = new DepGraph();

  return graphNode(node, undefined, graph, cache)
    .then(() => {
      const nodeNames = graph[graphType](graphArg);
      const nodes: Node[] =
        _.map(nodeNames, (name: string) => { return cache[name]; });
      return Promise.resolve(nodes);
    });
}

function all(node: file.Configuration) {
  return _map(node, 'overallOrder');
}

function deps(node: file.Configuration) {
  return _map(node, 'dependenciesOf', node.name);
}

function resolve(conf: file.Configuration) {
  if (!conf) {
    throw new Error('resolving without a root node');
  }
  return all(conf);
}

export { deps, createNode, loadCache, resolve as graph };
