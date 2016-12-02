import _ from 'lodash';
import path from 'path';
import {check, diff} from 'js-object-tools';
import {startsWith} from './util/string';
import log from './util/log';
import fs from './util/fs';
import argv from './util/argv';
import {Profile, keywords} from './profile';
import {Configuration} from './configuration';
import {parse, absolutePath, pathArray} from './parse';
import {jsonStableHash} from './util/hash';

function getAbsolutePaths(module) {
  // if conf.git?.archive
  //   defaultPathOptions.clone = '#{conf.name}-#{conf.git.archive}'
  const pathOptions = module.p;
  const d = diff.clone(module.d || {});
  // fetch
  if (!d.home) {
    d.home = `${argv.runDir}/${argv.cachePath}`;
  } // reference for build tools, should probably remove
  if (!d.root) {
    if (!module.name) {
      log.error(module);
      throw new Error('module has no name');
    }
    d.root = path.join(d.home, module.name);
  } // lowest level a package should have access to
  if (!d.clone) {
    d.clone = path.join(d.root, pathOptions.clone);
  }
  // build
  d.source = path.join(d.clone, pathOptions.source);
  d.project = path.join(d.root, pathOptions.project || '');
  // console.log colors.magenta d.project
  d.includeDirs = pathArray((pathOptions.includeDirs || 'source'), d.root);
  if (d.build == null) {
    d.build = path.join(d.root, pathOptions.build);
  }

  d.install = {
    binaries: _.map(diff.arrayify(pathOptions.install.binaries), (ft) => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.root, (ft.to || 'bin'))
      };
    }),
    headers: _.map(diff.arrayify(pathOptions.install.headers), (ft) => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.home, (ft.to || 'include')),
        includeFrom: path.join(d.home, (ft.includeFrom || ft.to || 'include'))
      };
    }),
    libraries: _.map(diff.arrayify(pathOptions.install.libraries), (ft) => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.home, (ft.to || 'lib'))
      };
    })
  };

  if (pathOptions.install.assets) {
    d.install.assets = _.map(diff.arrayify(pathOptions.install.assets), ft => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.root, (ft.to || 'bin'))
      };
    });
  }

  d.resolved = true;
  return d;
}

function getPathOptions(conf) {
  const defaultPathOptions = {
    source: '',
    headers: '',
    test: 'build_tests',
    clone: 'source',
    project: ''
  };

  const pathOptions = diff.extend(defaultPathOptions, conf.path);

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

  return pathOptions;
}

function resolveVersion(conf) {
  if (check(conf.version, String)) {
    return conf.name;
  } else if (check(conf.tag, String)) {
    return conf.tag;
  } else if (conf.git) {
    if (check(conf.git.tag, String)) {
      return conf.git.tag;
    } else if (check(conf.git.branch, String)) {
      return conf.git.branch;
    }
    return 'master';
  }
}

function resolveName(conf) {
  if (check(conf, String)) {
    return conf;
  } else if (check(conf.name, String)) {
    return conf.name;
  } else if (conf.git) {
    if (check(conf.git, String)) {
      return conf
        .git
        .slice(conf.git.indexOf('/') + 1);
    } else if (conf.git.repository) {
      return conf
        .git
        .repository
        .slice(conf.git.repository.indexOf('/') + 1);
    } else if (conf.git.url) {
      const lastPathComponent = conf
        .git
        .url
        .slice(conf.git.url.lastIndexOf('/') + 1);
      return lastPathComponent.slice(0, lastPathComponent.lastIndexOf('.'));
    }
  }
  log.error(conf);
  throw new Error('resolveName() failed');
}

class Module {
  constructor(conf, parent) {
    if (!conf) {
      throw new Error('constructing module with undefined configuration');
    }
    if (check(conf, Module)) {
      return conf;
    }
    this._conf = diff.clone(conf);
    if (this._conf.link) {
      const configDir = absolutePath(conf.link);
      const configPath = fs.configExists(configDir);
      if (configPath) {
        log.verbose(`load config from linked directory ${configPath}`);
        const rawConfig = fs.readConfigSync(configPath);
        diff.extend(this._conf, rawConfig);
      }
    }
    diff.extend(this, this._conf);
    if (!this.name) {
      this.name = resolveName(this);
    }
    if (!this.target) {
      this.target = 'static';
    }
    if (parent) {
      if (parent.profile) {
        this.profile = diff.combine(this.profile, parent.profile);
      }
      if (parent.override) {
        diff.extend(this, parent.override);
        diff.extend(this.override, parent.override);
      }
    } else {
      this.d = {
        root: argv.runDir
      };
    }
    this.profile = new Profile(this._conf);

    this.configuration = new Configuration(this.profile, diff.combine(this.build, this.configure));

    this.p = getPathOptions(this._conf);
    this.d = getAbsolutePaths(this);

    delete this._conf;
  }
  force() {
    return argv.forceAll || (argv.force && (argv.force === this.rawConfig.name));
  }
  j() {
    return this
      .profile
      .j();
  }
  fullPath(p) {
    if (startsWith(p, '/')) {
      return p;
    }
    return path.join(this.d.root, p);
  }
  globArray(val) {
    return _.map(diff.arrayify(val), (v) => {
      return parse(v, this);
    });
  }
  select(dict) {
    return this
      .profile
      .select(dict);
  }
  safe() {
    return JSON.parse(JSON.stringify(this));
  }
  serialize(entry) {
    const safe = diff.combine(this.safe(), _.omit(entry, ['cache', 'libs']));
    if (safe.deps) {
      safe.deps = _.map(safe.deps, (d) => {
        return {name: resolveName(d), hash: jsonStableHash(d)};
      });
    }
    if (safe.version == null) {
      safe.version = resolveVersion(safe);
    }
    if (safe.user == null) {
      safe.user = 'local';
    }
    return safe;
  }
}

// function printRepl(r, localDict) {
//   let string = '\n';
//   for (const k of r.inputs) {
//     const val = r.inputs(k);
//     let key = k;
//     if (r.directive) {
//       key = `${r.directive.prepost || r.directive.pre || ''}${k}${r.directive.prepost || r.directive.post || ''}`;
//     }
//     string += `${key} : ${parse(val, localDict)}\n`;
//   }
//   return string;
// }

export {Module, Profile, keywords};
