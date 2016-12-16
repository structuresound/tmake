import * as _ from 'lodash';
import * as path from 'path';
import {check, diff} from 'js-object-tools';
import {startsWith} from './util/string';
import log from './util/log';
import * as file from './util/file';
import args from './util/args';
import {Profile, keywords} from './profile';
import {Configuration} from './configuration';
import {parse, absolutePath, pathArray} from './parse';
import {jsonStableHash, stringHash} from './util/hash';

function getAbsolutePaths(node: Node): file.DirList {
  // if conf.git?.archive
  //   defaultPathOptions.clone = '#{conf.name}-#{conf.git.archive}'
  const pathOptions = node.p;
  const d: file.DirList = <file.DirList>diff.clone(node.d || {});
  // fetch
  if (!d.home) {
    d.home = `${args.runDir}/${args.cachePath}`;
  }  // reference for build tools, should probably remove
  if (!d.root) {
    if (!node.name) {
      log.error(node);
      throw new Error('node has no name');
    }
    d.root = path.join(d.home, node.name);
  }  // lowest level a package should have access to
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

  d.install = <file.install_list>{
    binaries: _.map(diff.arrayify(pathOptions.install.binaries), (ft: file.InstallOptions) => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.root, (ft.to || 'bin'))
      };
}),
    headers: _.map(diff.arrayify(pathOptions.install.headers), (ft: file.InstallOptions) => {
  return {
    matching: ft.matching,
    from: path.join(d.root, ft.from),
    to: path.join(d.home, (ft.to || 'include')),
    includeFrom: path.join(d.home, (ft.includeFrom || ft.to || 'include'))
  };
    }),
    libraries: _.map(diff.arrayify(pathOptions.install.libraries), (ft: file.InstallOptions) => {
  return {
    matching: ft.matching,
    from: path.join(d.root, ft.from),
    to: path.join(d.home, (ft.to || 'lib'))
  };
    })
}
;

if (pathOptions.install.assets) {
  d.install.assets = _.map(diff.arrayify(pathOptions.install.assets),
                           (ft: file.InstallOptions) => {
                             return {
                               matching: ft.matching,
                               from: path.join(d.root, ft.from),
                               to: path.join(d.root, (ft.to || 'bin'))
                             };
                           });
}
return d;
}

function getPathOptions(conf: file.Configuration) {
  const defaultPathOptions = {
    source: '',
    headers: '',
    test: 'build_tests',
    clone: 'source',
    project: ''
  };

  const pathOptions = <file.DirList>diff.extend(defaultPathOptions, conf.path);

  if (pathOptions.build == null) {
    pathOptions.build = path.join(pathOptions.project, 'build');
  }

  if (pathOptions.install == null) {
    pathOptions.install = {};
  }
  if (pathOptions.install.headers == null) {
    pathOptions.install
        .headers = [{from: path.join(pathOptions.clone, 'include')}];
  }

  if (pathOptions.install.libraries == null) {
    pathOptions.install.libraries = [{from: pathOptions.build}];
  }

  if (pathOptions.install.binaries == null) {
    pathOptions.install.binaries = [{from: pathOptions.build, to: 'bin'}];
  }

  return pathOptions;
}

function resolveVersion(conf: file.Configuration) {
  if (check(conf.version, String)) {
    return conf.name;
  } else if (check(conf.tag, String)) {
    return conf.tag;
  } else if (conf.git) {
    if (check(conf.git.tag, String)) {
      return conf.git.tag;
    } else if (check(conf.git.branch, String)) {
      return conf.git.branch;
    } else if (check(conf.git.archive, String)) {
      return conf.git.archive;
    }
    return 'master';
  }
}

function resolveName(conf: file.Configuration): string {
  if (check(conf.name, String)) {
    return conf.name;
  } else if (conf.git) {
    if (check(conf.git, String)) {
      const str: string = conf.git as string;
      return str.slice(str.indexOf('/') + 1);
    } else if (conf.git.repository) {
      return conf.git.repository.slice(conf.git.repository.indexOf('/') + 1);
    } else if (conf.git.url) {
      const lastPathComponent =
          conf.git.url.slice(conf.git.url.lastIndexOf('/') + 1);
      return lastPathComponent.slice(0, lastPathComponent.lastIndexOf('.'));
    }
  }
  throw new Error('resolveName() failed');
}

function mergeNodes(a: any, b: any) {
  for (const k of Object.keys(b)) {
    if (!a[k]) {
      a[k] = b[k];
    }
  }
  if (a.cache && b.cache) {
    mergeNodes(a.cache, b.cache);
  }
}

function parsePath(s: string) {
  if (startsWith(s, '/')) {
    return s;
  }
  return path.join(args.runDir, s);
}

function resolveUrl(node: Node) {
  let config: file.GitSettings = node.git || node.fetch || {};
  if (node.git) {
    if (typeof config === 'string') {
      config = <file.GitSettings>{repository: node.git as string};
    }
    if (!config.repository) {
      throw new Error(
          'dependency has git configuration, but no repository was specified');
    }
    const base = `https://github.com/${config.repository}`;
    const archive =
        config.archive || config.tag || config.branch || node.tag || 'master';
    return `${base}/archive/${archive}.tar.gz`;
  } else if (node.link) {
    return parsePath(node.link);
  } else if (node.fetch) {
    if (typeof config === 'string') {
      config = <file.GitSettings>{archive: node.fetch as string};
    }
    if (!config.archive) {
      throw new Error(
          'dependency has fetch configuration, but no archive was specified');
    }
    return config.archive;
  }
  return 'none';
}

class Node extends file.Configuration {
  _conf: file.Configuration;
  configuration: Configuration;
  profile: Profile;
  libs: string[];

  constructor(conf: file.Configuration, parent: Node) {
    super();
    // load conf, extend if link
    if (!conf) {
      throw new Error('constructing node with undefined configuration');
    }
    if (check(conf, Node)) {
      return conf as Node;
    }
    this._conf = diff.clone(conf);
    if (this._conf.link) {
      const configDir = absolutePath(conf.link);
      const configPath = file.configExists(configDir);
      if (configPath) {
        log.verbose(`load config from linked directory ${configPath}`);
        const rawConfig = file.readConfigSync(configPath);
        diff.extend(this._conf, rawConfig);
      }
    }

    // defaults
    diff.extend(this, this._conf);
    if (!this.name) {
      this.name = resolveName(this);
    }
    if (!this.override) {
      this.override = new file.Configuration();
    }

    // overrides
    if (parent) {
      this.profile = parent.profile;
      if (parent.override) {
        diff.extend(this.override, parent.override);
      }
    } else {
      this.d = <file.DirList>{root: args.runDir};
    }
    if (!this.target) {
      this.target = 'static';
    }
    diff.extend(this, this.override);

    // calculate paths + configuration sections
    if (!this.profile) {
      this.profile = new Profile(this);
    }
    if (!this.version) {
      this.version = resolveVersion(this);
    }
    if (!this.user) {
      this.user = 'local';
    }

    this.configuration = new Configuration(
        this.profile, <file.BuildSettings>diff.combine(this.build || {},
                                                       this.configure || {}));
    this.p = getPathOptions(this._conf);
    this.d = getAbsolutePaths(this);

    delete this._conf;
  }
  force() {
    return args.forceAll || (args.force && (args.force === this._conf.name));
  }
  j() { return this.profile.j(); }
  fullPath(p: string) {
    if (startsWith(p, '/')) {
      return p;
    }
    return path.join(this.d.root, p);
  }
  pathSetting(val: string) { return this.fullPath(parse(val, this)); }
  globArray(val: any) {
    return _.map(diff.arrayify(val), (v) => { return parse(v, this); });
  }
  select(dict: Object) { return this.profile.select(dict); }
  url(): string { return resolveUrl(this); }
  urlHash(): string { return stringHash(this.url()); }
  configHash(): string {
    return stringHash(this.urlHash() + this.configuration.hash());
  }
  merge(other: file.Configuration): void { mergeNodes(this, other); }
  toCache(): file.Configuration {
    return <file.Configuration>_.pick(this,
                                      ['cache', 'name', 'libs', 'version']);
  }
  safe(): file.Configuration {
    const plain = <file.Configuration>_.omit(
        diff.plain(this),
        ['_id', 'profile', 'configuration', 'cache', 'd', 'p']);
    if (plain.deps) {
      plain.deps =
          <file.Configuration[]>_.map(plain.deps, (d: file.Configuration) => {
            return {name: resolveName(d), hash: jsonStableHash(d)};
          });
    }
    return plain;
  }
}

export {Node, resolveName, Profile, keywords};
