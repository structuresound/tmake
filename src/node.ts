import * as os from 'os';
import * as _ from 'lodash';
import * as path from 'path';
import { check, clone, extend, combine, plain as toJSON, safeOLHM } from 'js-object-tools';
import cascade from './util/cascade';
import { startsWith } from './util/string';
import { log } from './util/log';
import args from './util/args';
import { parse, absolutePath, pathArray } from './parse';
import { jsonStableHash, stringHash } from './util/hash';
import { stdCxxFlags, stdFrameworks, stdLinkerFlags, stdCompilerFlags, jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compilerFlags';

import { CacheProperty } from './cache';
import { Environment } from './environment';

function getProjectDirs(project: Project): ProjectDirs {
  const pathOptions = project.p;
  const d: ProjectDirs = <ProjectDirs>clone(project.d || {});
  // fetch
  if (!d.home) {
    d.home = `${args.runDir}/${args.cachePath}`;
  }  // reference for build tools, should probably remove
  if (!d.root) { // dependency
    if (!project.name) {
      log.error(project);
      throw new Error('node has no name');
    }
    d.root = path.join(d.home, project.name);
    if (pathOptions.includeDirs) {
      d.includeDirs = pathArray((pathOptions.includeDirs), d.root);
    }
  }  // lowest level a package should have access to
  else {
    d.includeDirs = pathArray((pathOptions.includeDirs || 'source'), d.root);
  }
  if (!d.clone) {
    d.clone = path.join(d.root, pathOptions.clone);
  }
  d.source = path.join(d.clone, pathOptions.source);
  return d;
}

function getProjectPaths(node: Project) {
  const defaultPaths = {
    source: '',
    headers: '',
    clone: 'source',
  };
  const pathOptions = <ProjectDirs>extend(defaultPaths, node.path);
  return pathOptions;
}

function resolveVersion(conf: ProjectFile | Project) {
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

function resolveName(conf: ProjectFile | Project): string {
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
  throw new Error(`resolveName() failed on module ${JSON.stringify(conf, [], 2)}`);
}

function mergeNodes(a: Project, b: any) {
  if (!a || !b) return;
  for (const k of Object.keys(b)) {
    if (!a[k]) {
      a[k] = b[k];
    }
  }
  if (b.cache) {
    for (const k of Object.keys(b.cache)) {
      const v = b.cache[k]
      if (v) {
        a.cache[k].set(v);
      }
    }
  }
}

function parsePath(s: string) {
  if (startsWith(s, '/')) {
    return s;
  }
  return path.join(args.runDir, s);
}

function resolveUrl(conf: ProjectFile | Project) {
  let config: schema.Git = conf.git || conf.archive || {};
  if (conf.git) {
    if (typeof config === 'string') {
      config = <schema.Git>{ repository: conf.git as string };
    }
    if (!config.repository) {
      throw new Error(
        'dependency has git configuration, but no repository was specified');
    }
    const base = `https://github.com/${config.repository}`;
    const archive =
      config.archive || config.tag || config.branch || conf.tag || 'master';
    return `${base}/archive/${archive}.tar.gz`;
  } else if (conf.link) {
    return 'link';
  } else if (conf.archive) {
    if (typeof config === 'string') {
      config = <schema.Git>{ archive: conf.archive as string };
    }
    if (!config.archive) {
      throw new Error(
        'dependency has fetch configuration, but no archive was specified');
    }
    return config.archive;
  }
  return 'none';
}

class OLHV<T> {
  require?: string;
  value: T
}
class OLHM<T> {
  [index: string]: OLHV<T>;
}

class ProjectCache {
  [index: string]: CacheProperty<any>;
  fetch: CacheProperty<string>;
  metaData?: CacheProperty<string>;
  metaConfiguration?: CacheProperty<string>;
  bin?: CacheProperty<string>;
  libs?: CacheProperty<string[]>;
}

class Project implements ProjectFile {
  [index: string]: any;
  // implements ProjectFile
  name?: string;
  override?: Project;
  deps?: Project[];
  cache?: ProjectCache;
  link?: string;
  git?: schema.Git;
  archive?: { url?: string; }
  version?: string;
  tag?: string;
  user?: string;
  dir?: string;
  toolchains?: OLHM<schema.Toolchain>;

  // implements Toolchain
  build: schema.Build;
  configure: schema.Configure;
  host: schema.Platform;
  target: schema.Platform;
  tools: schema.Tools;
  outputType: string;
  path: EnvironmentDirs;
  environment?: any;

  // runtime
  environments: Environment[];
  libs: string[];
  d: ProjectDirs;
  p: ProjectDirs;

  constructor(_projectFile: ProjectFile, parent?: Project) {
    // load conf
    if (!_projectFile) {
      throw new Error('constructing node with undefined configuration');
    }
    if (check(_projectFile, Project)) {
      return <any>_projectFile;
    }
    const projectFile: ProjectFile = <ProjectFile>clone(_projectFile);
    const metaDataFields = _.pick(projectFile, ['name', 'version', 'user', 'dir', 'git', 'archive']);
    extend(this, metaDataFields);

    if (!this.name) {
      this.name = resolveName(projectFile);
    }

    this.p = getProjectPaths(this);
    if (!parent) {
      this.d = <EnvironmentDirs>{ root: args.runDir };
    }
    this.d = getProjectDirs(this);


    const toolchainFields = _.pick(projectFile, ['host', 'target', 'environment', 'tools', 'outputType', 'build', 'configure']);
    extend(this, toolchainFields);

    const toolchains = this.toolchains ? safeOLHM(this.toolchains) : [<schema.Toolchain>{}];
    this.environments = [];
    for (const t of toolchains) {
      this.environments.push(new Environment(t, this));
    }
    // Overrides
    if (parent) {
      if (parent.override) {
        extend(this, parent.override);
        extend(this.override, parent.override);
      }
    }
    // LAZY Defaults
    if (!this.version) {
      this.version = resolveVersion(this);
    }
    if (!this.user) {
      this.user = 'local';
    }

    this.cache = new ProjectCache;
    this.cache.fetch = new CacheProperty(() => stringHash(this.url()))
    this.cache.metaData = new CacheProperty(() => {
      return jsonStableHash({
        version: this.version,
        outputType: this.outputType || 'static',
        deps: this.safeDeps()
      });
    }, { require: this.cache.fetch });
  }

  force() {
    return args.force && ((args.force === this.name) || (args.force === 'all'));
  }
  url(): string { return resolveUrl(this); }
  safeDeps() {
    if (this.deps) {
      return _.map(this.deps, (node: Project) => {
        const dep = <SafeDep>{ name: node.name, hash: node.hash() };
        return dep;
      });
    }
  }
  merge(other: Project | Project): void { mergeNodes(this, other); }
  toCache(): ProjectFile {
    const ret = <ProjectFile>_.pick(this,
      ['name', 'libs', 'version']);
    ret.cache = {};
    for (const k of Object.keys(this.cache)) {
      const v = this.cache[k].value;
      if (v) {
        ret.cache[k] = v;
      }
    }
    return ret;
  }
  safe(stripDeps?: boolean): Project {
    const plain = <Project>_.omit(
      toJSON(this), ['_id', 'configuration', 'cache', 'd', 'p', 's']);
    if (plain.deps && stripDeps) {
      plain.deps = <any>this.safeDeps();
    }
    return plain;
  }
  hash() {
    return jsonStableHash(this.safe());
  }
}

export { Project, resolveName };
