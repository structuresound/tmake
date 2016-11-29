import {DepGraph} from 'dependency-graph';
import _ from 'lodash';
import Promise from 'bluebird';
import log from './util/log';
import argv from './util/argv';
import {cache as db} from './db';
import {Module} from './module';

function resolveDep(_dep, parent) {
  const module = new Module(_dep, parent);
  return db
    .findOne({name: module.name})
    .then((result) => {
      const existing = result || {
        cache: {
          test: {}
        }
      };
      const entry = module.serialize(existing);
      if (result) {
        return db.update({
          name: _dep.name
        }, {$set: entry}).then(() => {
          return Promise.resolve(module);
        });
      }
      return db
        .insert(entry)
        .then(() => {
          return Promise.resolve(module);
        });
    });
}

function resolveDeps(root, graph, cache) {
  if (root.deps) {
    return Promise.each(root.deps, dep => {
      return resolveDep(dep, root).then((module) => {
        if (module.name === root.name) {
          throw new Error('recursive dependency');
        }
        return _graph(module, graph, cache).then(() => {
          if (argv.verbose) {
            log.add(`add dependency ${module.name} >> ${root.name}`);
          }
          graph.addDependency(root.name, module.name);
          return Promise.resolve();
        });
      });
    }).then(() => {
      return resolveDep(root);
    });
  }
  return resolveDep(root);
}

function _graph(root, depGraph, cache) {
  if (cache[root.name]) {
    return Promise.resolve(depGraph);
  }
  depGraph.addNode(root.name);
  return resolveDeps(root, depGraph, cache).then(() => {
    const mut = cache;
    mut[root.name] = root;
    return _graph(root, depGraph, cache);
  });
}

function _map(dep, graphType) {
  const cache = {};
  return _graph(dep, new DepGraph(), cache).then((depGraph) => {
    return Promise.resolve(_.map(depGraph[graphType](), (name) => {
      return cache[name];
    }));
  });
}

function all(dep) {
  return _map(dep, 'overallOrder');
}

function deps(dep) {
  return _map(dep, 'dependenciesOf');
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
