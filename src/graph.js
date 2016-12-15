import {DepGraph} from 'dependency-graph';
import _ from 'lodash';
import Promise from 'bluebird';
import log from './util/log';
import args from './util/args';
import {cache as db} from './db';
import {Node} from './node';

function loadCache(node){
return db
    .findOne({name: node.name})
    .then((result) => {
      const existing = result || {
        cache: {
          debug: {},
          test: {}
        }
      };
      node.merge(existing);
      return Promise.resolve(node);
    });
}

function createNode(dep, parent) {
  const node = new Node(dep, parent);
  return loadCache(node);
}

function resolveDeps(root, graph, cache) {
  if (root.deps) {
    return Promise.each(root.deps, (dep) => {
      return createNode(dep, root).then((node) => {
        if (node.name === root.name) {
          throw new Error('recursive dependency');
        }
        return _graph(node, graph, cache).then(() => {
          if (args.verbose) {
            log.add(`add dependency ${node.name} >> ${root.name}`);
          }
          graph.addDependency(root.name, node.name);
          return Promise.resolve();
        });
      });
    }).then(() => {
      return createNode(root);
    });
  }
  return createNode(root);
}

function _graph(root, graph, cache) {
  if (cache[root.name]) {
    return Promise.resolve(graph);
  }
  if (!root.name) {
    throw new Error(`no name for graph in node ${root}`);
  }
  graph.addNode(root.name);
  return resolveDeps(root, graph, cache).then(() => {
    cache[root.name] = root;
    return _graph(root, graph, cache);
  });
}

function _map(node, graphType, graphArg) {
  const cache = {};
  const graph = new DepGraph();
  return _graph(node, graph, cache).then(() => {
    const nodeNames = graph[graphType](graphArg);
    const nodes = _.map(nodeNames, (name) => {
      return cache[name];
    });
    return Promise.resolve(nodes);
  });
}

function all(node) {
  return _map(node, 'overallOrder');
}

function deps(node) {
  return _map(node, 'dependenciesOf', node.name);
}

function resolve(root) {
  if (!root) {
    throw new Error('resolving without a root node');
  }
  return createNode(root).then((resolved) => {
    return all(resolved);
  });
}

export {all, deps, createNode, loadCache, resolve as graph};
