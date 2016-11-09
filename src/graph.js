import {DepGraph} from 'dependency-graph';
import _ from 'lodash';
import Promise from 'bluebird';
import path from 'path';
import {check} from 'js-object-tools';
import fs from './util/fs';
import cascade from './util/cascade';
import log from './util/log';
import argv from './util/argv';
import {startsWith} from './util/string';
import {cache as db} from './db';
import {Module, Profile} from './module';
import {absolutePath} from './parse';

function resolveDep(_dep, parent) {
  const mutable = _.clone(_dep);

  const module = new Module(_dep, parent);
  return db
    .findOne({name: module.name})
    .then((result) => {
      const merged = result || {
        cache: {
          test: {}
        }
      };
      _.extend(merged, _.omit(mutable, ['cache', 'libs']));
      if (result) {
        return db.update({
          name: mutable.name
        }, {$set: module.serialize()}).then(() => {
          return resolvePaths(merged, _dep.profile);
        });
      }
      log.verbose(entry, 'red');
      return db
        .insert(module.serialize())
        .then(() => {
          return resolvePaths(merged, _dep.profile);
        });
    });
}


function resolveDeps(root, graph, cache) {
  if (root.deps) {
    return Promise.each(root.deps, dep => {
      return resolveDep(dep, root).then((resolved) => {
        if (resolved.name === root.name) {
          throw new Error('recursive dependency');
        }
        return _graph(resolved, graph, cache).then(() => {
          if (argv.verbose) {
            log.add(`add dependency ${resolved.name} >> ${root.name}`);
          }
          return graph.addDependency(root.name, resolved.name);
        });
      });
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
    cache[root.name] = root;
    return Promise.resolve(depGraph);
  });
}

function _map(dep, graphType) {
  const cache = {};
  return _graph(dep, new DepGraph(), cache).then(graph => {
    return Promise.resolve(_.map(graph[graphType](), (name) => {
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
  return resolveDep(root).then(() => {
    return all(root);
  });
}

export {all, deps, resolve, resolve as graph};
