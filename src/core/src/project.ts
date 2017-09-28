import * as os from 'os';
import * as _ from 'lodash';
import * as path from 'path';
import { check, valueForKeyPath, mergeValueAtKeypath, clone, extend, contains, combine, okmap, plain as toJSON, arrayify, OLHM, select, map } from 'typed-json-transform';
import { startsWith } from './string';
import { log } from './log';
import { args } from './runtime';
import { absolutePath, pathArray } from './parse';
import { jsonStableHash, stringHash } from './hash';
import { jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compiler';
import { Git } from './git';
import { Property as CacheProperty } from './cache';
import { Configuration } from './configuration';
import { errors } from './errors';
import { semverRegex } from './lib';
import { Runtime, defaults } from './runtime';
import { Tools } from './tools';

export const metaDataKeys = ['name', 'user', 'path'];
export const sourceKeys = ['git', 'archive', 'version'];
export const toolchainKeys = ['host', 'target', 'outputType'];
export const pluginKeys = ['generate', 'build', 'configure'];
export const dependencyKeys = ['require', 'override'];
export const registryKeys = dependencyKeys.concat(metaDataKeys).concat(sourceKeys).concat(toolchainKeys).concat(pluginKeys);

export const ephemeralKeys = ['dir', 'd', 'p'];

function getProjectDirs(project: TMake.Project.Parsed, parent: TMake.Project.Parsed): TMake.Project.Dirs {
    const pathOptions = project.p;
    const d: TMake.Project.Dirs = <TMake.Project.Dirs>clone(project.d || {});
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
    d.install = <TMake.Install>{
        headers: _.map(arrayify(pathOptions.install.headers), (ft: TMake.Install.Options) => {
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

function getProjectPaths(paths: TMake.Project.Dirs) {
    const defaultPaths = {
        source: '',
        headers: '',
        build: 'build',
        clone: 'source',
    };
    const pathOptions = <TMake.Project.Dirs>extend(defaultPaths, paths);
    if (pathOptions.install == null) {
        pathOptions.install = {};
    }
    if (pathOptions.install.headers == null) {
        pathOptions.install
            .headers = [{ from: path.join(pathOptions.clone, 'include') }];
    }
    return pathOptions;
}

function resolveVersion(conf: TMake.Project.Parsed) {
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

function loadCache(a: Project, b: TMake.Project.Cache.File) {
    if (!a || !b) return;
    for (const k of Object.keys(b)) {
        if (!a.parsed[k]) {
            a.parsed[k] = b[k];
        }
    }
    if (b.cache) {
        for (const k of Object.keys(b.cache)) {
            const v = b.cache[k];
            if (v) {
                log.dev('cache -->', k, ':', v);
                a.cache[k] && a.cache[k].set(v);
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

function resolveUrl(project: TMake.Project.Parsed): string {
    if (project.git) {
        return project.git.fetch();
    }
    if (project.link) {
        return 'link';
    }
    if (project.archive) {
        return project.archive;
    }
    if (!args.test && project.d.root === args.runDir) {
        // this is the root module
        return 'none';
    }
    log.warn(`cannot resolve source url, is ${project.name} a meta project?`);
    return 'none';
}

export function fromGitString(str: string) {
    return { git: new Git(str) };
}

export class Project {
    raw: TMake.Project.Raw
    parsed: TMake.Project.Parsed
    cache: TMake.Project.Cache
    dependencies: { [index: string]: TMake.Project }

    constructor(_projectFile: TMake.Project.Raw, parent?: Project) {
        // load conf
        if (!_projectFile) {
            throw new Error('constructing node with undefined configuration');
        }
        if (check(_projectFile, Project)) {
            return <any>_projectFile;
        }

        if (check(_projectFile, String)) {
            this.raw = fromGitString(<string><any>_projectFile);
        } else {
            this.raw = <TMake.Project.Raw>clone(_projectFile);
        }


        const layer = Runtime.moss(this.raw);
        const parsed = layer.data;

        this.parsed = {
            ...parsed,
            host: { ...defaults.host, ...parsed.host }
        };

        if (this.parsed.git) {
            this.parsed.git = new Git(this.raw.git);
        }
        if (!this.parsed.name) {
            this.parsed.name = Project.resolveName(this.parsed);
        }
        // LAZY Defaults
        if (!this.parsed.version) {
            const version = resolveVersion(this.parsed);
            if (semverRegex().test(version)) {
                this.parsed.version = semverRegex().exec(version)[0];
            } else {
                this.parsed.version = version || 'master';
            }
        }
        if (!this.parsed.user) {
            this.parsed.user = 'local';
        }

        for (const name of Object.keys(this.parsed.host.tools)) {
            const tool = this.parsed.host.tools[name];
            if (tool.name == null) {
                tool.name = name;
            }
            if (tool.bin == null) {
                tool.bin = name;
                tool.bin = Tools.pathForTool(tool);
            }
        }

        this.parsed.p = getProjectPaths(this.parsed.path);
        this.parsed.d = getProjectDirs(this.parsed, parent ? parent.parsed : undefined);

        if (!this.parsed.outputType) {
            this.parsed.outputType = 'static';
        }

        // Overrides
        if (parent) {
            if (parent.parsed.override) {
                for (const selector of Object.keys(parent.parsed.override)) {
                    const override = parent.parsed.override[selector];
                    mergeValueAtKeypath(override, `override.${selector}`, this.parsed);
                    if (selector === 'force' || select([this.parsed.name], selector)) {
                        for (const kp of Object.keys(override)) {
                            const val = override[kp];
                            mergeValueAtKeypath(val, kp, this.parsed);
                        }
                    }
                }
            }
        }

        // Instantiate Target Configurations
        const targets = this.raw.targets ? OLHM.safe(this.raw.targets) : [defaults.target];
        this.parsed.configurations = map(targets, (conf) => {
            const targetSelectors = {
                [this.parsed.host.compiler.cpp]: true,
                [this.parsed.host.compiler.c]: true,
                [conf.platform]: true,
                [conf.architecture]: true
            }
            const targetState = clone(layer.state);
            targetState.selectors = { ...targetState.selectors, ...targetSelectors };

            return <TMake.Configuration>new Configuration(conf, targetState, this);
        });

        /* CACHE */
        const fetch = new CacheProperty(() => stringHash(this.url()));
        const metaData = new CacheProperty(() => {
            return jsonStableHash({
                version: this.parsed.version,
                outputType: this.parsed.outputType,
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
        return args.force && ((args.force === this.parsed.name) || (args.force === 'all'));
    }
    url(): string { return resolveUrl(this.parsed); }
    safeDeps(): { [index: string]: TMake.Project.Cache.File } {
        const safe = {};
        if (this.dependencies) {
            for (const k of Object.keys(this.dependencies)) {
                const dep = <any>this.dependencies[k];
                if (!dep.parsed.name) {
                    throw (new Error(log.getMessage('dep has no name', dep)));
                }
                safe[k] = { name: dep.parsed.name, hash: dep.hash() };
            }
        }
        return safe;
    }
    loadCache(cache: TMake.Project.Cache.File): void { loadCache(this, cache); }
    toCache(): TMake.Project.Raw {
        const ret = <TMake.Project.Raw>_.pick(this.parsed,
            ['name', 'libs', 'version']);
        ret.cache = {};
        ret.hash = this.hash();
        for (const k of Object.keys(this.cache)) {
            const prop = this.cache[k];
            const v = prop.value();
            if (v) {
                log.verbose(`cache <-- ${k}: `, v);
                ret.cache[k] = v;
            }
        }
        return ret;
    }
    toRegistry(): TMake.Project.Raw {
        const plain = <TMake.Project.Raw>_.pick(this.parsed, registryKeys);
        if (plain.require) {
            plain.require = <any>this.safeDeps();
        }
        return plain;
    }
    hash() {
        return jsonStableHash(this.toRegistry());
    }
}

export namespace Project {
    export function resolveName(conf: TMake.Project.Raw | TMake.Project.Parsed, fallback?: string): string {
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
}