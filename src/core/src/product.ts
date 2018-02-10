import * as os from 'os';
import * as _ from 'lodash';
import { join } from 'path';
import { check, valueForKeyPath, each, merge, mergeValueAtKeypath, clone, extend, contains, combine, okmap, plain as toJSON, arrayify, select, map, flatObject, extendN } from 'typed-json-transform';
import { startsWith } from './string';
import { log } from './log';
import { args } from './runtime';
import { absolutePath, pathArray } from './parse';
import { jsonStableHash, stringHash } from './hash';
import { jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compiler';
import { Property as CacheProperty } from './cache';
import { Configuration } from './configuration';
import { errors } from './errors';
import { Runtime, defaults, settings, next } from './runtime';
import { inherits } from 'util';

export const packageKeys = ['name', 'user', 'tag'];
export const sourceKeys = ['git', 'archive', 'version'];
export const toolchainKeys = ['host', 'target'];
export const pluginKeys = ['generate', 'build', 'configure'];
export const dependencyKeys = ['require', 'override'];

export const ephemeralKeys = ['dir', 'd', 'p'];

function getProductDirs(product: TMake.Product, project: TMake.Project) {
    const { path } = product.trie;
    const defaultPaths = {
        source: '',
        install: {
            headers:  <TMake.Install.Options>{
                from: 'include'
            },
            assets: <TMake.Install.Options>undefined
        },
    };
    
    const p = {...defaultPaths, path};
    const d = {...product.d};

    const {headers, assets} = p.install;
    d.install.headers = {
        matching: headers.matching,
        from: join(d.source, headers.from),
        to: join(project.d.home, headers.to || 'include')
    }
    if (assets) {
        d.install.assets = {
            matching: assets.matching,
            from: join(project.d.root, assets.from),
            to: join(args.runDir, assets.to || 'bin')
        }
    }
    return {d, p};
}

function targetsFromProduct(product: TMake.Product, build: TMake.Trie.Platforms){
    return <any>okmap(build, (platform, platformName) => {
        return okmap(platform, (target, architecture) => {
                const options = {
                    environment: {
                        target
                    },
                    selectors: {
                        ...product.trie.options,
                        [defaults.environment.host.compiler]: true,
                        [platformName]: true,
                        [target.architecture]: true
                    }
                }
                const parsedProduct = Runtime.moss(product.trie, options);
                const parsedTarget = Runtime.inherit(defaults.target, target, options);
                const config = merge(parsedProduct, parsedTarget);
                return config;
        });
    });
}

function loadCache(a: Product, b: TMake.Product.Cache.File) {
    if (!a || !b) return;
    for (const k of Object.keys(b)) {
        if (!a[k]) {
            a[k] = b[k];
        }
    }
    // if (b.cache) {
    //     for (const k of Object.keys(b.cache)) {
    //         const v = b.cache[k];
    //         if (v) {
    //             log.dev('cache -->', k, ':', v);
    //             a.cache[k] && a.cache[k].set(v);
    //         }
    //     }
    // }
}

function parsePath(s: string) {
    if (startsWith(s, '/')) {
        return s;
    }
    return join(args.runDir, s);
}

export class Product extends TMake.Product {
    constructor(options: TMake.Product.Constructor) {
        super(options);
        const {trie, project, build, inherit} = options;
        const { environment } = defaults;
        if (!trie) {
            throw new Error('constructing node with undefined configuration');
        }
        if (check(trie, Product)) {
            return <any>trie;
        }
        this.trie = clone(trie);
        extend(this, _.pick(defaults, packageKeys));
        extend(this, _.pick(trie, packageKeys));
        extend(this, getProductDirs(this, project));

        // Overrides
        // if (parent) {
        //     if (parent.parsed.override) {
        //         for (const selector of Object.keys(parent.parsed.override)) {
        //             const override = parent.parsed.override[selector];
        //             mergeValueAtKeypath(override, `override.${selector}`, this.parsed);
        //             if (selector === 'force' || select([this.name], selector)) {
        //                 for (const kp of Object.keys(override)) {
        //                     const val = override[kp];
        //                     mergeValueAtKeypath(val, kp, this.parsed);
        //                 }
        //             }
        //         }
        //     }
        // }
        this.platforms = <any>this.generateTargets({build, inherit});

        /* CACHE */
        const metaData = new CacheProperty(() => {
            return jsonStableHash({
                require: this.safeDeps()
            });
        });
        const libs = new CacheProperty(() => {
            throw new Error('no getter, resolved during install phase');
        });
        this.cache = {
            metaData,
            libs
        }
    }

    force() {
        return args.force && ((args.force === this.name) || (args.force === 'all'));
    }
    generateTargets({build, inherit}) {
        const { environment } = defaults;
        const projectConfigs: TargetConfigs = targetsFromProduct(this, build);
    
        let inheritConfigs: TargetConfigs;
        if (inherit){
            inheritConfigs = targetsFromProduct(inherit, build);
        }
    
        type TargetConfigs = {[index: string]: {[index: string]: TMake.Trie.Target}}
    
        const targets = okmap(projectConfigs, (platform, platformName) => {
            return okmap(platform, (config, architecture) => {
                if (inherit){
                    const intermediate = inheritConfigs[platformName][architecture];
                    return new Configuration({target: <any>merge(intermediate, config), product: this});
                } else {
                    return new Configuration({target: <any>config, product: this});
                }
            });
        });
        return targets;
    }
    safeDeps(): { [index: string]: TMake.Product.Cache.File } {
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
    loadCache(cache: TMake.Product.Cache.File): void { loadCache(this, cache); }
    toCache(): TMake.Product.Cache.File {
        const ret = <TMake.Product.Cache.File>_.pick(this, packageKeys);
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
    toRegistry(): TMake.Source.File {
        const meta = <TMake.Source.File>_.pick(this, packageKeys);
        return {...meta, ...this.raw};
    }
    hash() {
        return jsonStableHash(this.toRegistry());
    }
}

