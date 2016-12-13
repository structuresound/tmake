import {DepGraph} from 'dependency-graph';
import _ from 'lodash';
import Promise from 'bluebird';
import log from './util/log';
import args from './util/args';
import {cache as db} from './db';
import {Node} from './node';

function resolveDep(dep, parent) {
  const node = new Node(dep, parent);
  return db
    .findOne({name: node.name})
    .then((result) => {
      const existing = result || {
        cache: {
          test: {}
        }
      };
      const entry = node.serialize(existing);
      if (result) {
        return db.update({
          name: dep.name
        }, {$set: entry}).then(() => {
          return Promise.resolve(node);
        });
      }
      return db
        .insert(entry)
        .then(() => {
          return Promise.resolve(node);
        });
    });
}

function resolveDeps(root, graph, cache) {
  if (root.deps) {
    return Promise.each(root.deps, (dep) => {
      return resolveDep(dep, root).then((node) => {
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
      return resolveDep(root);
    });
  }
  return resolveDep(root);
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
    throw new Error('resolving without a profile');
  }
  return resolveDep(root).then((resolved) => {
    return all(resolved);
  });
}

export {all, deps, resolve, resolve as graph};
