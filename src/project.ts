import * as os from 'os';
import * as _ from 'lodash';
import * as path from 'path';
import { check, clone, extend, combine, plain as toJSON, safeOLHM, arrayify, OLHM } from 'js-object-tools';
import cascade from './cascade';
import { startsWith } from './string';
import { log } from './log';
import { args } from './args';
import { parse, absolutePath, pathArray } from './parse';
import { jsonStableHash, stringHash } from './hash';
import { stdCxxFlags, stdFrameworks, stdLinkerFlags, stdCompilerFlags, jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compilerFlags';

import { Build } from './build';
import { Configure } from './configure';
import { Install, InstallOptions } from './install';
import { Git } from './fetch';
import { CacheProperty } from './cache';
import { Toolchain, Platform, Environment, EnvironmentDirs } from './environment';
import { Tools } from './tools';

export interface Project$Set {
  libs?: string[];

  'cache'?: Object;
  'cache.fetch'?: string;
  'cache.metaData'?: string;
  'cache.metaConfiguration'?: string;
  'cache.libs'?: string[];
  'cache.buildFile'?: string;
  'cache.bin'?: string;
}

export interface Project$Unset extends Project$Set {
  cache?: boolean;
}

export interface ProjectModifier {
  [index: string]: any;

  $set?: Project$Set;
  $unset?: Project$Unset;
}

export interface ProjectDirs {
  root: string;
  home: string;
  clone: string;
  source: string;
  install: Install;
  includeDirs: string[];
}

export interface PersistedProjectCache {
  [index: string]: any;

  fetch?: string;
  metaData?: string;
  metaConfiguration?: string;
  bin?: string;
  libs?: string[];
}


export interface ProjectFile extends Toolchain {
  [index: string]: any;

  // metadata
  name?: string;
  override?: Project;
  require?: OLHM<ProjectFile>;
  cache?: any;
  link?: string;
  git?: Git;
  archive?: { url?: string; }
  tree?: string;
  version?: string;
  tag?: string;
  user?: string;
  dir?: string;
  toolchains?: OLHM<Toolchain>;

  // implements Toolchain
  build?: Build;
  configure?: Configure;
  host?: Platform;
  target?: Platform;
  tools?: Tools;
  outputType?: string;
  path?: EnvironmentDirs;
  environment?: any;
}

export const metaDataKeys = ['name', 'version', 'user', 'dir', 'git', 'archive'];
export const toolchainKeys = ['host', 'target', 'environment', 'tools', 'outputType', 'build', 'configure'];
export const dependencyKeys = ['require'];
export const registryKeys = dependencyKeys.concat(metaDataKeys).concat(toolchainKeys);

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

  d.install = <Install>{
    headers: _.map(arrayify(pathOptions.install.headers), (ft: InstallOptions) => {
      return {
        sources: ft.sources,
        from: path.join(d.root, ft.from),
        to: path.join(d.home, (ft.to || 'include')),
        includeFrom: path.join(d.home, (ft.includeFrom || ft.to || 'include'))
      };
    })
  }
  return d;
}

function getProjectPaths(node: Project) {
  const defaultPaths = {
    source: '',
    headers: '',
    clone: 'source',
  };
  const pathOptions = <ProjectDirs>extend(defaultPaths, node.path);
  if (pathOptions.install == null) {
    pathOptions.install = {};
  }
  if (pathOptions.install.headers == null) {
    pathOptions.install
      .headers = [{ from: path.join(pathOptions.clone, 'include') }];
  }
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

export function resolveName(conf: ProjectFile | Project): string {
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
        log.verbose('cache -->', k, ':', v);
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
  let config: Git = conf.git || conf.archive || {};
  if (conf.git) {
    if (typeof config === 'string') {
      config = <Git>{ repository: conf.git as string };
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
      config = <Git>{ archive: conf.archive as string };
    }
    if (!config.archive) {
      throw new Error(
        'dependency has fetch configuration, but no archive was specified');
    }
    return config.archive;
  }
  return 'none';
}

export interface ProjectCache {
  fetch: CacheProperty<string>;
  metaData?: CacheProperty<string>;
  metaConfiguration?: CacheProperty<string>;
  bin?: CacheProperty<string>;
  libs?: CacheProperty<string[]>;
}

type OutputType = "static" | "dynamic" | "executable";

export class Project implements ProjectFile {
  [index: string]: any;
  // implements ProjectFile
  name?: string;
  override?: Project;
  require?: OLHM<Project>;
  cache?: ProjectCache;
  link?: string;
  git?: Git;
  archive?: { url?: string; }
  version?: string;
  tag?: string;
  tree?: string;
  user?: string;
  dir?: string;
  toolchains?: OLHM<Toolchain>;

  // implements Toolchain
  build: Build;
  configure: Configure;
  host: Platform;
  target: Platform;
  tools: Tools;
  outputType: OutputType;
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
    const metaDataFields = _.pick(projectFile, metaDataKeys);
    extend(this, metaDataFields);

    if (!this.name) {
      this.name = resolveName(projectFile);
    }

    this.p = getProjectPaths(this);
    if (!parent) {
      this.d = <EnvironmentDirs>{ root: args.runDir };
    }
    this.d = getProjectDirs(this);

    const toolchainFields = _.pick(projectFile, toolchainKeys);
    extend(this, toolchainFields);
    if (!this.outputType) {
      this.outputType = 'static';
    }
    const toolchains = this.toolchains ? safeOLHM(this.toolchains) : [<Toolchain>{}];
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

    const fetch = new CacheProperty(() => stringHash(this.url()));
    const metaData = new CacheProperty(() => {
      return jsonStableHash({
        version: this.version,
        outputType: this.outputType,
        require: this.safeDeps()
      });
    }, { require: fetch });
    const libs = new CacheProperty(() => {
      throw new Error('no getter, resolved during install phase');
    })

    this.cache = {
      fetch,
      metaData,
      libs
    }
  }

  force() {
    return args.force && ((args.force === this.name) || (args.force === 'all'));
  }
  url(): string { return resolveUrl(this); }
  safeDeps() {
    const safe = {};
    if (this.require) {
      for (const k of Object.keys(this.require)) {
        const v = <any>this.require[k];
        if (!v.name) {
          throw (new Error(log.getMessage('dep has no name', v)));
        }
        safe[k] = { name: v.name, hash: v.hash() };
      }
    }
    return safe;
  }
  merge(other: Project | Project): void { mergeNodes(this, other); }
  toCache(): ProjectFile {
    const ret = <ProjectFile>_.pick(this,
      ['name', 'libs', 'version']);
    ret.cache = {};
    for (const k of Object.keys(this.cache)) {
      const v = this.cache[k].value();
      if (v) {
        log.verbose(`cache <-- ${k}: ${v}`);
        ret.cache[k] = v;
      }
    }
    return ret;
  }
  toRegistry(): Project {
    const plain = <Project>_.pick(this, registryKeys);
    if (plain.require) {
      plain.require = <any>this.safeDeps();
    }
    return plain;
  }
  hash() {
    return jsonStableHash(this.toRegistry());
  }
}