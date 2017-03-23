import * as os from 'os';
import * as _ from 'lodash';
import * as path from 'path';
import { check, valueForKeyPath, mergeValueAtKeypath, clone, extend, combine, plain as toJSON, safeOLHM, arrayify, OLHM, select } from 'typed-json-transform';
import { startsWith } from './string';
import { log } from './log';
import { args } from './args';
import { parse, absolutePath, pathArray } from './parse';
import { jsonStableHash, stringHash } from './hash';
import { jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compiler';
import { Install, InstallOptions } from './install';
import { Git, GitConfig } from './git';
import { CacheProperty } from './cache';
import { Toolchain, Platform, Environment, EnvironmentDirs } from './environment';
import { Tools } from './tools';
import { errors } from './errors';

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
  build: string;
  install: Install;
  includeDirs: string[];
  localCache: string;
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
  override?: OLHM<ProjectFile>;
  require?: OLHM<ProjectFile>;
  cache?: any;
  link?: string;
  git?: GitConfig;
  archive?: string;
  tree?: string;
  version?: string;
  tag?: string;
  user?: string;
  // ephemeral
  dir?: string;
  cacheDir?: string
  toolchains?: OLHM<Toolchain>;

  // implements Toolchain
  build?: any;
  configure?: any;
  host?: Platform;
  options?: OLHM<any>;
  target?: Platform;
  tools?: Tools;
  outputType?: string;
  path?: EnvironmentDirs;
  environment?: any;
}

export const metaDataKeys = ['name', 'user', 'path'];
export const sourceKeys = ['git', 'archive', 'version'];
export const toolchainKeys = ['host', 'target', 'environment', 'tools', 'outputType'];
export const pluginKeys = ['generate', 'build', 'configure'];
export const dependencyKeys = ['require', 'override'];
export const registryKeys = dependencyKeys.concat(metaDataKeys).concat(sourceKeys).concat(toolchainKeys).concat(pluginKeys);

export const ephemeralKeys = ['dir', 'd', 'p']

function getProjectDirs(project: Project, parent: Project): ProjectDirs {
  const pathOptions = project.p;
  const d: ProjectDirs = <ProjectDirs>clone(project.d || {});
  if (!d.home) {
    d.home = path.join(args.runDir, args.cachePath);
  }
  if (parent) {
    if (!project.name) {
      log.error(project);
      throw new Error('node has no name');
    }
    if (parent.d.localCache && !d.localCache) {
      d.localCache = parent.d.localCache;
    }
    d.root = project.dir || path.join(d.localCache || d.home, project.name);
  } else {
    d.root = args.configDir
  }
  if (project.link) {
    d.localCache = path.join(project.dir, args.cachePath);
  }
  if (pathOptions.includeDirs) {
    d.includeDirs = pathArray((pathOptions.includeDirs), d.root);
  } else {
    d.includeDirs = [];
  }
  if (!d.clone) {
    d.clone = path.join(d.root, pathOptions.clone);
  }
  d.source = path.join(d.clone, pathOptions.source);
  d.build = path.join(d.root, pathOptions.build);
  d.install = <Install>{
    headers: _.map(arrayify(pathOptions.install.headers), (ft: InstallOptions) => {
      return {
        matching: ft.matching,
        from: path.join(d.root, ft.from),
        to: path.join(d.home, (ft.to || 'include')),
        includeFrom: path.join(d.home, (ft.includeFrom || ft.to || 'include'))
      };
    })
  }
  return d;
}

function getProjectPaths(project: Project) {
  const defaultPaths = {
    source: '',
    headers: '',
    build: 'build',
    clone: 'source',
  };
  const pathOptions = <ProjectDirs>extend(defaultPaths, project.path);
  if (pathOptions.install == null) {
    pathOptions.install = {};
  }
  if (pathOptions.install.headers == null) {
    pathOptions.install
      .headers = [{ from: path.join(pathOptions.clone, 'include') }];
  }
  return pathOptions;
}

function resolveVersion(conf: Project) {
  if (conf.git) {
    return conf.git.version();
  }
  if (check(conf.version, String)) {
    return conf.version;
  }
  if (check(conf.tag, String)) {
    return conf.tag;
  }
}

export function resolveName(conf: ProjectFile | Project, fallback?: string): string {
  if (check(conf, String)) {
    return new Git(<string><any>conf).name();
  }
  if (check(conf.name, String)) {
    return conf.name;
  }
  if (conf.git) {
    return new Git(conf.git).name();
  }
  if (fallback) {
    return fallback;
  }
  log.throw('resolveName() failed on module', conf);
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
        log.dev('cache -->', k, ':', v);
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

function resolveUrl(conf: Project): string {
  if (conf.git) {
    return new Git(conf.git).fetch();
  }
  if (conf.link) {
    return 'link';
  }
  if (conf.archive) {
    return parse(conf.archive, conf);
  }
  if (!args.test && conf.d.root === args.runDir) {
    // this is the root module
    return 'none';
  }
  log.warn(`cannot resolve source url, is ${conf.name} a meta project?`);
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

export function fromString(str: string) {
  return { git: new Git(str) };
}

export class Project implements ProjectFile {
  [index: string]: any;
  // implements ProjectFile
  name?: string;
  override?: OLHM<Project>;
  require?: OLHM<Project>;
  cache?: ProjectCache;
  link?: string;
  git?: Git;
  archive?: string;
  version?: string;
  tag?: string;
  tree?: string;
  user?: string;
  // ephemeral
  dir?: string;
  cacheDir?: string
  toolchains?: OLHM<Toolchain>;

  // implements Toolchain
  build: any;
  configure: any;
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
    let projectFile: ProjectFile;
    if (check(_projectFile, String)) {
      projectFile = fromString(<string><any>_projectFile);
    } else {
      projectFile = <ProjectFile>clone(_projectFile);
    }
    const registryFields = _.pick(projectFile, registryKeys);
    extend(this, registryFields);
    if (this.git) {
      this.git = new Git(this.git);
    }

    const ephemeralFields = _.pick(projectFile, ephemeralKeys);
    extend(this, ephemeralFields);

    if (!this.name) {
      this.name = resolveName(projectFile);
    }

    this.p = getProjectPaths(this);
    this.d = getProjectDirs(this, parent);

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
        for (const selector of Object.keys(parent.override)) {
          const override = parent.override[selector];
          mergeValueAtKeypath(override, `override.${selector}`, this);
          if (selector === 'force' || select([this.name], selector)) {
            for (const kp of Object.keys(override)) {
              const val = override[kp];
              mergeValueAtKeypath(val, kp, this);
            }
          }
        }
      }
    }
    // LAZY Defaults
    if (!this.version) {
      this.version = resolveVersion(this);
    }
    if (!this.user) {
      this.user = 'local';
    }
    /* CACHE */
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
        log.dev(`cache <-- ${k}: ${v}`);
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