import {check, clone, extend} from 'typed-json-transform';
import {join} from 'path';

import {args} from './runtime';
import {log} from './log';
import {Git} from './git';
import { jsonStableHash, stringHash } from './hash';
import { Property as CacheProperty } from './cache';
import { semverRegex } from './lib';

function resolveUrl(project : TMake.Project) : string {
    const {trie, git} = project;
    if (git) {
        return git.fetch();
    }
    if (trie.link) {
        return 'link';
    }
    if (trie.archive) {
        return trie.archive;
    }
    if (!args.test && project.d.root === args.runDir) {
        // this is the root module
        return 'none';
    }
    log.warn(`cannot resolve source url, is ${trie.name} a meta project?`);
    return 'none';
}

function resolveVersion(project: TMake.Project) {
    if (project.git) {
        return project.git.version();
    }
    if (check(project.version, String)) {
        return project.version;
    }
}

function getProjectDirs(project: TMake.Project, parent : TMake.Project) {
    const p = {
        clone: 'source',
        ...project.trie.path
    };

    const d: TMake.Project.Dirs = {
        ...project.d
    }
    if (!d.home) {
        d.home = args.homeDir;
    }
    if (parent) {
        if (!name) {
            log.error(project);
            throw new Error('product node has no name');
        }
        d.root = project.dir || join(d.localCache || join(d.home, args.cachePath), project.name);
    } else {
        d.root = args.configDir;
    }

    if (!d.root) 
        throw new Error(`no root dir for project ${project.name}`);

    return {d, p};
}

export function fromGitString(str: string) {
    return { git: new Git(str) };
}

export class Project extends TMake.Project {
    constructor(options: TMake.Project.Constructor){
        super(options);
        const {trie, parent} = options;

        if (this.git) {
            this.git = new Git(trie.git);
        }
        if (!this.name) {
            this.name = this.git.name();
        }

        // LAZY Defaults
        if (!this.version) {
            const version = resolveVersion(this);
            if (semverRegex().test(version)) {
                this.version = semverRegex().exec(version)[0];
            } else {
                this.version = '0.0.1';
            }
        }

        extend(this, getProjectDirs(this, parent));

        /* CACHE */
        const fetch = new CacheProperty(() => stringHash(this.url()));
        const meta = new CacheProperty(() => {
            return jsonStableHash({
                version: this.version
            });
        }, { require: fetch });
        this.cache = {
            fetch
        }
    }
    url(): string { return resolveUrl(this); }
}

export namespace Project {
    export function resolveName(conf : TMake.Trie.Project, fallback?: string) : string {
        if(check(conf.name, String)) {
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
