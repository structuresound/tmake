import {DepGraph} from 'dependency-graph';
import _ from 'underscore';
import Promise from 'bluebird';
import path from 'path';
import check from '1e1f-tools';
import fs from './util/fs';
import cascade from './util/cascade';
import log from './util/log';
import argv from './util/argv';
import * as db from './db';

function parsePath(s) {
  if (!check(s, String)) {
    throw new Error(`${s} is not a string`);
  }
  if (s.startsWith('/')) {
    return s;
  }
  return path.join(argv.runDir, s);
}

function arrayify(val) {
  if (check(val, Array)) {
    return val;
  }
  return [val];
}

function fullPath(p, root) {
  if (p.startsWith('/')) {
    return p;
  }
  path.join(root, p);
}

function pathArray(val, root) {
  return _.map(arrayify(val), (v) => {
    return fullPath(v, root);
  });
}

function resolvePaths(dep, platform) {
  const mutable = _.clone(dep);
  if (dep.link) {
    const configDir = parsePath(dep.link);
    const configPath = fs.configExists(configDir);
    if (configPath) {
      log.verbose(`load config from linked directory ${configPath}`);
      const rawConfig = fs.readConfigSync(configPath);
      _.extend(dep, cascade.deep(rawConfig, platform.keywords, platform.selectors));
    }
  }

  const defaultPathOptions = {
    source: '',
    headers: '',
    test: 'build_tests',
    clone: 'source',
    temp: 'transform',
    includeDirs: '',
    project: ''
  };

  // if dep.git?.archive
  //   defaultPathOptions.clone = '#{dep.name}-#{dep.git.archive}'
  const pathOptions = _.extend(defaultPathOptions, dep.path);

  if (pathOptions.build == null) {
    pathOptions.build = path.join(pathOptions.project, 'build');
  }

  if (pathOptions.install == null) {
    pathOptions.install = {};
  }
  if (pathOptions.install.headers == null) {
    pathOptions.install.headers = {
      from: path.join(pathOptions.clone, 'include')
    };
  }

  if (pathOptions.install.libraries == null) {
    pathOptions.install.libraries = {
      from: pathOptions.build
    };
  }

  if (pathOptions.install.binaries == null) {
    pathOptions.install.binaries = {
      from: pathOptions.build
    };
  }

  if (pathOptions.install.binaries.to == null) {
    pathOptions.install.binaries.to = 'bin';
  }
  const d = _.extend({}, dep.d);
  // fetch
  if (d.home == null) {
    d.home = `${argv.runDir}/${argv.cachePath}`;
  } // reference for build tools, should probably remove
  if (d.root == null) {
    d.root = path.join(d.home, dep.name);
  } // lowest level a package should have access to
  if (d.temp == null) {
    d.temp = path.join(d.root, pathOptions.temp);
  }
  if (d.clone == null) {
    d.clone = path.join(d.root, pathOptions.clone);
  }
  // build
  if (dep.transform) {
    d.source = path.join(d.temp, pathOptions.source);
  } else {
    d.source = path.join(d.clone, pathOptions.source);
  }
  d.project = path.join(d.root, pathOptions.project || '');
  // console.log colors.magenta d.project
  d.includeDirs = pathArray((pathOptions.includeDirs || 'source/include'), d.root);
  if (d.build == null) {
    d.build = path.join(d.root, pathOptions.build);
  }

  d.install = {
    binaries: _.map(arrayify(pathOptions.install.binaries), (ft) => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.root, (ft.to || 'bin'))
      };
    }),
    headers: _.map(arrayify(pathOptions.install.headers), (ft) => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.home, (ft.to || 'include')),
        includeFrom: path.join(d.home, (ft.includeFrom || ft.to || 'include'))
      };
    }),
    libraries: _.map(arrayify(pathOptions.install.libraries), (ft) => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.home, (ft.to || 'lib'))
      };
    })
  };

  if (pathOptions.install.assets) {
    d.install.assets = _.map(arrayify(pathOptions.install.assets), ft => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.root, (ft.to || 'bin'))
      };
    });
  }

  d.resolved = true;
  mutable.d = d;
  mutable.p = pathOptions;

  return Promise.resolve(mutable);
}

function resolveDep(_dep, parent) {
  let mutable = _.clone(_dep);
  if (parent) {
    if (parent.platform) {
      mutable.platform = parent.platform;
    }
    if (parent.override) {
      _.extend(mutable, parent.override);
      _.extend(mutable.override, parent.override);
    }
  }

  mutable = cascade.deep(mutable, mutable.platform.keywords, mutable.platform.selectors);
  if (mutable.name == null) {
    mutable.name = resolveDepName(mutable);
  }
  if (mutable.target == null) {
    mutable.target = 'static';
  }

  return db
    .findOne({name: mutable.name})
    .then((result) => {
      const merged = result || {
        cache: {
          test: {}
        }
      };
      _.extend(merged, _.omit(mutable, ['cache', 'libs']));
      const entry = _.clone(merged);
      if (entry.deps) {
        entry.deps = _.map(entry.deps, (d) => {
          return {name: resolveDepName(d)};
        });
      }
      if (entry.version == null) {
        entry.version = resolveDepVersion(mutable);
      }
      if (entry.user == null) {
        entry.user = 'local';
      }
      if (result) {
        return db.update({
          name: mutable.name
        }, {$set: entry}).then(() => {
          return resolvePaths(merged);
        });
      }
      log.verbose(entry, 'red');
      return db
        .insert(entry)
        .then(() => {
          return resolvePaths(merged);
        });
    });
}

function resolveDepVersion(dep) {
  if (check(dep.version, String)) {
    return dep.name;
  } else if (check(dep.tag, String)) {
    return dep.tag;
  } else if (dep.git) {
    if (check(dep.git.tag, String)) {
      return dep.git.tag;
    } else if (check(dep.git.branch, String)) {
      return dep.git.branch;
    }
    return 'master';
  }
}

function resolveDepName(dep) {
  if (check(dep, String)) {
    return dep;
  } else if (check(dep.name, String)) {
    return dep.name;
  } else if (dep.git) {
    if (check(dep.git, String)) {
      return dep
        .git
        .slice(dep.git.indexOf('/') + 1);
    } else if (dep.git.repository) {
      return dep
        .git
        .repository
        .slice(dep.git.repository.indexOf('/') + 1);
    } else if (dep.git.url) {
      const lastPathComponent = dep
        .git
        .url
        .slice(dep.git.url.lastIndexOf('/') + 1);
      return lastPathComponent.slice(0, lastPathComponent.lastIndexOf('.'));
    }
  }
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
  return resolveDep(root).then(() => {
    return all(root);
  });
}

export default {all, deps, resolve};
