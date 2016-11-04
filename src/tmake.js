import _ from 'underscore';
import Promise from 'bluebird';
import path from 'path';
import colors from 'chalk';

import './util/string';
import fs from './util/fs';
import platform from './dsl/platform';
import prompt from './prompt';
import graph from './graph';
import cloud from './cloud';
import configure from './build/configure';
import build from './build/build';
import install from './install';
import fetch from './util/fetch';
import test from './test';
import log from './util/log';
import argv from './util/argv';
import cli from './cli';
import * as db from './db';

const buildPhase = {
  fetch(dep) {
    if (dep.fetch || dep.git || dep.link) {
      if (dep.link) {
        return fetch.linkSource();
      }
      return fetch.validate();
    }
    return Promise.resolve();
  },
  configure(dep, tests) {
    if (configure.hashMetaConfiguration() !== dep.cache.metaConfiguration) {
      if (dep.cache.url) {
        fs.nuke(dep.d.clone);
      }
    }
    return buildPhase
      .fetch(dep)
      .then(() => configure.execute().then(() => {
        return install.headers(dep, platform, db, tests);
      }));
  },
  build(dep, tests) {
    return buildPhase
      .configure(dep, tests)
      .then(() => build.execute(dep, platform, db, tests));
  },
  install(dep, phase, tests) {
    return buildPhase
      .build(dep, tests)
      .then(() => install.execute(dep, platform, db));
  },
  clean(dep) {
    return cleanDep(dep);
  },
  test(dep) {
    return buildPhase
      .build(dep, true)
      .then(() => test.execute(dep, platform, db));
  }
};

function cleanDep(dep) {
  log.quiet(`cleaning ${dep.name}`);
  log.verbose(dep.d);
  log.verbose(dep.libs);
  if (fs.existsSync(dep.d.build)) {
    log.quiet(`rm -R ${dep.d.build}`);
    fs.nuke(dep.d.build);
  }
  _.each(dep.libs, (libFile) => {
    log.quiet(`rm ${libFile}`);
    if (fs.existsSync(libFile)) {
      fs.unlinkSync(libFile);
    }
  });
  fs.prune(dep.d.root);
  const modifier = {
    $unset: {
      'cache.configuration': true,
      'cache.metaConfiguration': true,
      'cache.target': true,
      'cache.libs': true,
      'cache.bin': true
    }
  };
  const preserve = ['_id', 'cache', 'name'];
  _.each(dep, (v, k) => {
    if (!_.contains(preserve, k)) {
      modifier.$unset[k] = true;
    }
  });
  return db.update({
    name: dep.name
  }, modifier, {}).then(() => {
    if (dep.cache.generatedBuildFile) {
      const generatedBuildFile = path.join(dep.d.project, dep.cache.buildFile);
      const unsetter = {
        $unset: {
          'cache.buildFile': true
        }
      };
      try {
        if (fs.existsSync(generatedBuildFile)) {
          log.quiet(`clean generatedBuildFile ${generatedBuildFile}`);
          if (fs.lstatSync(generatedBuildFile).isDirectory()) {
            fs.nuke(generatedBuildFile);
          } else {
            fs.unlinkSync(generatedBuildFile);
          }
        }
      } catch (err) {
        log.error(err(colors.yellow(err.message || err)));
      }
      return db.update({
        name: dep.name
      }, unsetter, {});
    }
    return Promise.resolve();
  });
}

function findDepNamed(name, root) {
  if ((root || {}).name === name) {
    return root;
  }
  for (const dep of root.deps || root.dependencies) {
    if (dep.name === name) {
      return dep;
    } else if (graph.resolveDepName(dep) === name) {
      return dep;
    }
    const found = findDepNamed(name, dep);
    if (found) {
      return found;
    }
  }
}

function resolveRoot(configFile) {
  if (argv._[1]) {
    const dep = findDepNamed(argv._[1], configFile);
    if (dep) {
      return graph.resolve(dep);
    }
    throw new Error(`no dependency matching ${argv._[1]}`);
  } else {
    return graph.resolve(_.extend(configFile, {
      d: {
        root: argv.runDir
      }
    }));
  }
}

function execute(rawConfig, phase) {
  return resolveRoot(rawConfig).then((deps) => {
    if (!argv.quiet) {
      log.quiet(_.map(deps, d => d.name).join(' >> '), 'green');
    }
    if (argv.nodeps) {
      return processDep(root, phase);
    }
    return Promise.resolve(deps, dep => processDep(dep, phase));
  });
}

function processDep(dep, phase) {
  if (!argv.quiet) {
    log.quiet(`<< ${dep.name} >>`, 'green');
  }
  if (!dep.cached || argv._[0] === 'clean' || platform.force(dep)) {
    if (argv.verbose) {
      log.quiet(`>> ${phase} >>`);
    }
    process.chdir(argv.runDir);
    return buildPhase[phase](dep);
  }
  return Promise.resolve(dep);
}

function unlink(config) {
  const query = {
    name: config.name,
    tag: config.tag || 'master'
  };
  return db
    .localRepo
    .findOne(query)
    .then((doc) => {
      if (doc) {
        return db
          .localRepo
          .remove(query);
      }
      return Promise.resolve();
    });
}

const link = config => prompt.ask(colors.green(`link will do a full build, test and if successful will link to the local db @ ${argv.userCache}\n${colors.yellow('do that now?')} ${colors.gray('(yy = disable this warning)')}`)).then((res) => {
  if (res) {
    return execute(config, 'install');
  }
  return Promise.reject('user abort');
}).then(() => db.findOne({name: config.name})).then((json) => {
  if (json.cache.bin || json.cache.libs) {
    if (!argv.quiet) {
      log.quiet(`${json.name} >> local repo`, 'magenta');
    }
    const doc = _.omit(json, '_id', 'cache');
    if (argv.verbose) {
      log.quiet(JSON.stringify(doc, 0, 2));
    }
    const query = {
      name: doc.name,
      tag: doc.tag || 'master'
    };
    return db
      .localRepo
      .update(query, {
        $set: doc
      }, {upsert: true});
  }
  return Promise.reject(new Error('link failed because build or test failed'));
});

const push = config => prompt.ask(colors.green(`push will do a clean, full build, test and if successful will upload to the ${colors.yellow('public repository')}\n${colors.yellow('do that now?')} ${colors.gray('(yy = disable this warning)')}`)).then((res) => {
  if (res) {
    return execute(config, 'install');
  }
  return Promise.reject('user aborted push command');
}).then(() => db.findOne({name: config.name})).then((json) => {
  if (json.cache.bin || json.cache.libs) {
    return cloud
      .post(json)
      .then((res) => {
        if (argv.v) {
          log.quiet(`<< ${JSON.stringify(res, 0, 2)}`, 'magenta');
        }
        return Promise.resolve(res);
      });
  }
  return Promise.reject(new Error('link failed because build or test failed'));
});

function findAndClean(depName) {
  return db
    .findOne({name: depName})
    .then((dep) => {
      if (dep) {
        return graph
          .resolveDep(dep)
          .then(cleanDep)
          .then(() => db.findOne({name: depName}).then(cleaned => log.verbose(cleaned)));
      }
      return Promise.reject(`didn't find dep for ${depName}`);
    });
}

function list() {
  let selector = {};
  let repo = db.cache;
  if (argv._[1] === 'local') {
    repo = db.localRepo;
    selector = {
      name: argv._[2]
    };
  } else if (argv._[1]) {
    selector = {
      name: argv._[1]
    };
  }
  return repo
    .find(selector)
    .then(deps => log.info(JSON.stringify(deps, 0, 2)));
}

const tmake = {
  execute,
  push,
  link,
  unlink,
  platform,
  run(rootConfig) {
    const resolvedName = argv._[1] || rootConfig.name || graph.resolveDepName(rootConfig);
    switch (argv._[0]) {
      case 'rm':
        return db
          .remove({name: resolvedName})
          .then(() => log.quiet(`cleared cache for ${resolvedName}`));
      case 'clean':
        if (resolvedName === 'all' && rootConfig.deps) {
          return Promise
            .each(rootConfig.deps, dep => findAndClean(dep.name))
            .then(() => findAndClean(rootConfig.name));
        }
        return graph
          .resolveDep(rootConfig)
          .then(cleanDep);

      case 'reset':
      case 'nuke':
        log.quiet(`nuke cache ${path.join(argv.runDir, argv.cachePath)}`);
        fs.nuke(path.join(argv.runDir, argv.cachePath));
        fs.nuke(path.join(argv.runDir, 'bin'));
        fs.nuke(path.join(argv.runDir, 'build'));
        return log.quiet('post nuke freshness');
      case 'link':
        return db
          .findOne({name: resolvedName})
          .then(dep => link(dep || rootConfig));
      case 'unlink':
        return db
          .findOne({name: resolvedName})
          .then(dep => unlink(dep || rootConfig));
      case 'push':
        return db
          .findOne({name: resolvedName})
          .then(dep => push(dep || rootConfig));
      case 'test':
        return execute(rootConfig, 'test');
      case 'fetch':
        return execute(rootConfig, 'fetch');
      case 'parse':
        log.quiet(`parsing with selectors:\n ${platform.selectors}`);
        log.quiet(graph.resolve(rootConfig), 'magenta');
        break;
      case 'configure':
        return execute(rootConfig, 'configure');
      case 'build':
        return execute(rootConfig, 'build');
      case 'install':
        return execute(rootConfig, 'install');
      case 'all':
        return execute(rootConfig, 'install');
      case 'example':
      case 'init':
        return log.error(`there's already a ${argv.program} project file in this directory`);
      case 'path':
        if (argv._[1]) {
          return db
            .find({name: argv._[1]})
            .then(deps => log.verbose(_.map(deps, dep => graph.resolvePaths(dep))));
        }
        break;
      case 'ls':
      case 'list':
        return list();
      default:
        log.quiet(cli.manual());
    }
  }
};

export default tmake;
