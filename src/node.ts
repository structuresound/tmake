import * as os from 'os';
import * as _ from 'lodash';
import * as path from 'path';
import {check, diff} from 'js-object-tools';
import cascade from './util/cascade';
import {startsWith} from './util/string';
import log from './util/log';
import * as file from './util/file';
import args from './util/args';
import {Configuration} from './configuration';
import {parse, absolutePath, pathArray} from './parse';
import {jsonStableHash, stringHash} from './util/hash';

interface Settings {
  [index: string]: string;
}

const settings: any =
    file.parseFileSync(path.join(args.binDir, 'settings.yaml'));

const platformNames: Settings = {
  linux: 'linux',
  darwin: 'mac',
  mac: 'mac',
  win: 'win',
  win32: 'win',
  ios: 'ios',
  android: 'android'
};

const archNames: Settings = {x64: 'x86_64', arm: 'armv7a', arm64: 'arm64'};

const HOST_ENDIANNESS = os.endianness();
const HOST_PLATFORM = platformNames[os.platform()];
const HOST_ARCHITECTURE = archNames[os.arch()];
const HOST_CPU = os.cpus();

const ninjaVersion = 'v1.7.1';

const HOST_ENV = {
  architecture: HOST_ARCHITECTURE,
  endianness: HOST_ENDIANNESS,
  compiler: settings.defaultCompiler[HOST_PLATFORM],
  platform: HOST_PLATFORM,
  cpu: {num: HOST_CPU.length, speed: HOST_CPU[0].speed}
};

const DEFAULT_TARGET = {
  architecture: HOST_ARCHITECTURE,
  endianness: HOST_ENDIANNESS,
  platform: HOST_PLATFORM
};

const DEFAULT_TOOLCHAIN = {
  ninja: {
    version: ninjaVersion,
    url:
        'https://github.com/ninja-build/ninja/releases/download/{version}/ninja-{host.platform}.zip'
  },
  'host-mac': {clang: {bin: '$(which gcc)'}},
  'host-linux': {gcc: {bin: '$(which gcc)'}}
};

function parseSelectors(dict: any, prefix: string) {
  const _selectors: string[] = [];
  const selectables: Settings =
      <Settings>_.pick(dict, ['platform', 'compiler']);
  for (const key of Object.keys(selectables)) {
    _selectors.push(`${prefix || ''}${selectables[key]}`);
  }
  return _selectors;
}

const DEFAULT_ENV =
    file.parseFileSync(path.join(args.binDir, 'environment.yaml'));
const _keywords: any =
    file.parseFileSync(path.join(args.binDir, 'keywords.yaml'));
const keywords =
    []
        .concat(_.map(_keywords.host, (key) => { return `host-${key}`; }))
        .concat(_keywords.target)
        .concat(_keywords.build)
        .concat(_keywords.compiler)
        .concat(_keywords.sdk)
        .concat(_keywords.ide)
        .concat(_keywords.deploy);

const argvSelectors = Object.keys(_.pick(args, keywords));
argvSelectors.push(args.compiler);


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
  }
  if (conf.git) {
    if (check(conf.git, String)) {
      const str: string = conf.git as string;
      return str.slice(str.lastIndexOf('/') + 1);
    }
    if (conf.git.repository) {
      return conf.git.repository.slice(conf.git.repository.indexOf('/') + 1);
    }
    if (conf.git.url) {
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
  libs: string[];
  selectors: string[];

  constructor(_conf: file.Configuration, parent: Node) {
    super();
    // load conf, extend if link
    if (!_conf) {
      throw new Error('constructing node with undefined configuration');
    }
    if (check(_conf, Node)) {
      return _conf as Node;
    }
    const mutable = diff.clone(_conf);
    const metaDataFields = _.pick(mutable, ['name', 'version', 'user']);
    diff.extend(this, metaDataFields);
    if (!this.name) {
      this.name = resolveName(mutable);
    }
    if (!mutable.override) {
      mutable.override = new file.Configuration();
    }

    // 1. set up selectors + environment
    this.host = <file.Platform>diff.combine(HOST_ENV, mutable.host);
    this.target = <file.Platform>diff.combine(DEFAULT_TARGET, mutable.target);

    const hostSelectors = parseSelectors(this.host, 'host-');
    const targetSelectors = parseSelectors(this.target, undefined);
    this.selectors = hostSelectors.concat(targetSelectors);


    const environment =
        cascade.deep(diff.combine(DEFAULT_ENV, mutable.environment), keywords,
                     this.selectors);
    diff.extend(this, environment);

    // 2. setup paths + directories

    this.path = this.select(mutable.path || {});
    this.p = getPathOptions(this);

    if (!parent) {
      this.d = <file.DirList>{root: args.runDir};
    }
    this.d = getAbsolutePaths(this);

    // 3. extend + select all remaining settings
    const inOutFields = _.pick(mutable, ['git', 'fetch', 'outputType']);
    diff.extend(this, this.select(inOutFields));
    if (!this.outputType) {
      this.outputType = 'static';
    }
    this.toolchain = this.selectToolchain(mutable);

    const mainOperations = _.pick(mutable, ['configure', 'build']);
    diff.extend(this, this.select(mainOperations));
    this.configuration = new Configuration(
        this, <file.BuildSettings>diff.combine(_.pick(this.build, ['with']),
                                               this.configure || {}));
    // Overrides
    if (parent) {
      if (parent.override) {
        diff.extend(this, parent.override);
        diff.extend(this.override, parent.override);
      }
    }
    // LAZY Defaults
    if (!this.version) {
      this.version = resolveVersion(this);
    }
    if (!this.user) {
      this.user = 'local';
    }
  }
  force() {
    return args.force && ((args.force === this.name) || (args.force === 'all'));
  }
  j() { return this.host.cpu.num; }
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
  url(): string { return resolveUrl(this); }
  urlHash(): string { return stringHash(this.url()); }
  configHash(): string {
    return stringHash(this.urlHash() + this.configuration.hash());
  }
  parse(input: any, conf?: any) {
    if (conf) {
      const dict =
          diff.combine(this, cascade.deep(conf, keywords, this.selectors));
      return parse(input, dict);
    }
    return parse(input, this);
  }
  select(base: any, options: {keywords?:{}, selectors?:{}, dict?:{}, ignore?: {keywords?: string[], selectors?: string[]}} = {ignore: {}}) {
    if (!base) {
      throw new Error('selecting on empty object');
    }
    const mutableOptions = diff.clone(options);

    mutableOptions.keywords =
        _.difference(keywords, mutableOptions.ignore.keywords);
    mutableOptions.selectors =
        _.difference(this.selectors, mutableOptions.ignore.selectors);

    const flattened =
        cascade.deep(base, mutableOptions.keywords, mutableOptions.selectors);
    const parsed = this.parse(flattened, mutableOptions.dict);
    return parsed;
  }
  selectToolchain(conf: file.Configuration) {
    const buildSystems = ['cmake', 'ninja'];
    const compilers = ['clang', 'gcc', 'msvc'];

    const toolchain = this.select(
        DEFAULT_TOOLCHAIN,
        {dict: this, ignore: {keywords: buildSystems.concat(compilers)}});
    if (conf.host && conf.toolchain) {
      const customToolchain = this.select(
          conf.toolchain,
          {dict: this, ignore: {keywords: buildSystems.concat(compilers)}});
      diff.extend(toolchain, conf.toolchain);
    }
    for (const name of Object.keys(toolchain)) {
      const tool = toolchain[name];
      if (tool.bin == null) {
        tool.bin = name;
      }
      if (tool.name == null) {
        tool.name = name;
      }
    }
    return toolchain;
  }
  merge(other: Node | file.Configuration): void { mergeNodes(this, other); }
  toCache(): file.Configuration {
    return <file.Configuration>_.pick(this,
                                      ['cache', 'name', 'libs', 'version']);
  }
  safe(stripDeps?: boolean): file.Configuration {
    const plain = <file.Configuration>_.omit(
        diff.plain(this), ['_id', 'configuration', 'cache', 'd', 'p']);
    if (plain.deps && stripDeps) {
      plain.deps =
          <file.Configuration[]>_.map(plain.deps, (d: file.Configuration) => {
            return {name: resolveName(d), hash: jsonStableHash(d)};
          });
    }
    return plain;
  }
}

export {Node, resolveName, keywords, argvSelectors};
