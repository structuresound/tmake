import * as os from 'os';
import * as _ from 'lodash';
import * as path from 'path';
import { check, valueForKeyPath, mergeValueAtKeypath, clone, extend, combine, plain as toJSON, arrayify, OLHM, select, map } from 'typed-json-transform';
import { startsWith } from './string';
import { log } from './log';
import { args } from './runtime';
import { parse, absolutePath, pathArray } from './parse';
import { jsonStableHash, stringHash } from './hash';
import { jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compiler';
import { Git } from './git';
import { Property as CacheProperty } from './cache';
import { Configuration } from './configuration';
import { errors } from './errors';
import { semverRegex } from './lib';
import { Runtime } from './runtime';

export const metaDataKeys = ['name', 'user', 'path'];
export const sourceKeys = ['git', 'archive', 'version'];
export const toolchainKeys = ['host', 'target', 'environment', 'tools', 'outputType'];
export const pluginKeys = ['generate', 'build', 'configure'];
export const dependencyKeys = ['require', 'override'];
export const registryKeys = dependencyKeys.concat(metaDataKeys).concat(sourceKeys).concat(toolchainKeys).concat(pluginKeys);

export const ephemeralKeys = ['dir', 'd', 'p']

function getProjectDirs(project: TMake.Project.Post, parent: TMake.Project.Post): TMake.Project.Dirs {
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

function resolveVersion(conf: TMake.Project.Post) {
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

function mergeNodes(a: Project, b: any) {
    if (!a || !b) return;
    for (const k of Object.keys(b.post)) {
        if (!a.post[k]) {
            a.post[k] = b.post[k];
        }
    }
    if (b.cache) {
        for (const k of Object.keys(b.cache)) {
            const v = b.cache[k]
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

function resolveUrl(project: TMake.Project.Post): string {
    if (project.git) {
        return project.git.fetch();
    }
    if (project.link) {
        return 'link';
    }
    if (project.archive) {
        return parse(project.archive, project);
    }
    if (!args.test && project.d.root === args.runDir) {
        // this is the root module
        return 'none';
    }
    log.warn(`cannot resolve source url, is ${project.name} a meta project?`);
    return 'none';
}

export function fromString(str: string) {
    return { git: new Git(str) };
}

export class Project {
    pre: TMake.Project.Pre

    meta: TMake.Project.Meta
    post: TMake.Project.Post

    cache: TMake.Project.Cache

    constructor(_projectFile: TMake.Project.Pre, parent?: Project) {
        // load conf
        if (!_projectFile) {
            throw new Error('constructing node with undefined configuration');
        }
        if (check(_projectFile, Project)) {
            return <any>_projectFile;
        }

        if (check(_projectFile, String)) {
            this.pre = fromString(<string><any>_projectFile);
        } else {
            this.pre = <TMake.Project.Pre>clone(_projectFile);
        }

        this.post = <any>clone(this.pre);
        if (this.post.git) {
            this.post.git = new Git(this.pre.git);
        }
        if (!this.post.name) {
            this.post.name = Project.resolveName(this.post);
        }
        // LAZY Defaults
        if (!this.post.version) {
            const version = resolveVersion(this.post);
            if (semverRegex().test(version)) {
                this.post.version = semverRegex().exec(version)[0];
            } else {
                this.post.version = version || 'master';
            }
        }
        if (!this.post.user) {
            this.post.user = 'local';
        }

        this.post.p = getProjectPaths(this.post.path);
        this.post.d = getProjectDirs(this.post, parent ? parent.post : undefined);

        const toolchainFields = _.pick(this.post, toolchainKeys);
        extend(this, toolchainFields);
        if (!this.post.outputType) {
            this.post.outputType = 'static';
        }

        const targets = this.pre.targets ? OLHM.safe(this.pre.targets) : [Runtime.defaultTarget];
        this.post.configurations = map(targets, (conf) => {
            return <TMake.Configuration>new Configuration(conf, this);
        });

        // Overrides
        if (parent) {
            if (parent.post.override) {
                for (const selector of Object.keys(parent.post.override)) {
                    const override = parent.post.override[selector];
                    mergeValueAtKeypath(override, `override.${selector}`, this);
                    if (selector === 'force' || select([this.post.name], selector)) {
                        for (const kp of Object.keys(override)) {
                            const val = override[kp];
                            mergeValueAtKeypath(val, kp, this);
                        }
                    }
                }
            }
        }
        /* CACHE */
        const fetch = new CacheProperty(() => stringHash(this.url()));
        const metaData = new CacheProperty(() => {
            return jsonStableHash({
                version: this.post.version,
                outputType: this.post.outputType,
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
        return args.force && ((args.force === this.post.name) || (args.force === 'all'));
    }
    url(): string { return resolveUrl(this.post); }
    safeDeps(): { [index: string]: TMake.Project.Cache.File } {
        const safe = {};
        if (this.post.require) {
            for (const k of Object.keys(this.post.require)) {
                const v = <any>this.post.require[k];
                if (!v.name) {
                    throw (new Error(log.getMessage('dep has no name', v)));
                }
                safe[k] = { name: v.name, hash: v.hash() };
            }
        }
        return safe;
    }
    merge(other: Project | Project): void { mergeNodes(this, other); }
    toCache(): TMake.Project.Pre {
        const ret = <TMake.Project.Pre>_.pick(this.post,
            ['name', 'libs', 'version']);
        ret.cache = {};
        ret.hash = this.hash();
        for (const k of Object.keys(this.cache)) {
            const v = this.cache[k].value();
            if (v) {
                log.dev(`cache <-- ${k}: ${v}`);
                ret.cache[k] = v;
            }
        }
        return ret;
    }
    toRegistry(): TMake.Project.Pre {
        const plain = <TMake.Project.Pre>_.pick(this.post, registryKeys);
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
    export function resolveName(conf: TMake.Project.Pre | TMake.Project.Post, fallback?: string): string {
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