import * as _ from 'lodash';
import { join } from 'path';
import * as fs from 'fs';
import { resolve } from 'bluebird';
import { cascade, check, clone, contains, map, arrayify, combine, combineN, extend, okmap, plain as toJSON, OLHM } from 'typed-json-transform';
import { startsWith } from './string';
import { log } from './log';
import { jsonStableHash, fileHashSync, stringHash } from './hash';
import { iterable } from './iterate';
import { Phase } from './phase';
import { jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compiler';
import { Cache as BaseCache, Property as CacheProperty } from './cache';
import { Runtime, parseSelectors } from './runtime';
import { execAsync } from './shell';
import { mkdir } from 'shelljs';
import { absolutePath, pathArray } from './parse';
import { Plugin as BasePlugin } from './plugin';
import { Project } from './project';
import { args, defaults } from './runtime';
import { next } from 'js-moss';
import { interpolate } from './interpolate';

export class Cache extends BaseCache<string> {
    configuration: Configuration;
    assets?: TMake.Cache.Property<string>;
    plugin: BaseCache<string>
    constructor(configuration) {
        super();
        this.configuration = configuration;
        this.generate = new CacheProperty<string>(() => {
            return jsonStableHash(configuration.generate || {});
        });
        this.configure = new CacheProperty<string>(() => {
            return jsonStableHash(configuration.configure || {});
        });
        this.build = new CacheProperty<string>(() => {
            return jsonStableHash(configuration.build || {});
        });
        this.assets = new CacheProperty<string>(() => {
            return "";
        });
    }
    update() {
        this.configuration.update();
    }
    toJSON() {
        const ret = {};
        for (const k of Object.keys(this)) {
            if (check(this[k], CacheProperty)) {
                const v = this[k].value();
                if (v) {
                    log.dev(`cache <-- ${k}: ${v}`);
                    ret[k] = v;
                }
            }
        }
        return ret;
    }
}


function loadCache(a: Configuration, b: TMake.Configuration.Cache.File) {
    if (!a || !b) return;
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

function getConfigurationDirs(pathOptions: TMake.Configuration.Dirs, projectDirs: TMake.Project.Dirs): TMake.Configuration.Dirs {
    const d = <TMake.Configuration.Dirs>clone(projectDirs);

    d.build = join(d.root, pathOptions.build);
    d.project = join(d.root, pathOptions.project || '');
    if (d.build == null) {
        d.build = join(projectDirs.build, pathOptions.build);
    }
    d.install = <TMake.Install>{
        binaries: map(arrayify(pathOptions.install.binaries), (ft: TMake.Install.Options) => {
            return {
                matching: ft.matching,
                from: join(d.root, ft.from),
            };
        }),
        libraries: map(arrayify(pathOptions.install.libraries), (ft: TMake.Install.Options) => {
            return {
                matching: ft.matching,
                from: join(d.root, ft.from),
                to: join(d.home, (ft.to || 'lib'))
            };
        })
    }
    if (pathOptions.install.assets) {
        d.install.assets = map(arrayify(pathOptions.install.assets),
            (ft: TMake.Install.Options) => {
                return {
                    matching: ft.matching,
                    from: join(d.root, ft.from),
                    to: join(args.runDir, ft.to)
                };
            });
    }
    return d;
}


function getConfigurationPaths(_paths: TMake.Configuration.Dirs, architecture: string, outputType: string) {
    const paths = combine({
        root: '',
        test: 'build_tests'
    }, _paths);

    paths.build = join(paths.build, architecture);

    if (!check(paths.project, String)) {
        // if (outputType === 'executable') {
        //     paths.project = paths.build;
        // } else {
        paths.project = paths.clone;
        // }
    }
    if (!(paths.install.libraries)) {
        paths.install.libraries = [{ from: paths.build }];
    }
    if (!(paths.install.binaries)) {
        paths.install.binaries = [{ from: paths.build }];
    }

    return paths;
};

function getProjectFile(configuration: Configuration, systemName: string): string {
    const buildFileNames = {
        ninja: 'build.ninja',
        cmake: 'CMakeLists.txt',
        gyp: 'binding.gyp',
        make: 'Makefile',
        tmake: 'tmake.yaml',
        xcode: `${configuration.project}.xcodeproj`
    };
    return (<any>buildFileNames)[systemName];
}

function objectify<T>(input: T) {
    if (check(input, String)) {
        return <T><any>{
            [<string><any>input]: {}
        };
    }
    return input || <T><any>{};
}

export class Configuration {
    raw: TMake.Platform;
    parsed: TMake.Configuration.Parsed;
    cache: TMake.Configuration.Cache;
    plugins: { [index: string]: TMake.Plugin }
    project: TMake.Project;

    constructor(raw: TMake.Platform, state: Moss.State, project: TMake.Project) {
        this.project = project;
        this.plugins = {};

        const combined = { ...clone(project.parsed), target: raw };
        const moss = next({ data: {}, state }, combined);

        this.parsed = moss.data;
        delete this.parsed['targets'];
        const path = this.parsed.p;
        const p = getConfigurationPaths(<any>path, this.parsed.target.architecture, this.parsed.outputType);
        const d = getConfigurationDirs(p, this.parsed.d);
        extend(this.parsed, {
            path: path,
            p,
            d
        });

        this.cache = new Cache(this);
    }
    hash(): string {
        return jsonStableHash({
            environment: this.parsed.environment,
            meta: _.pick(this.project, ['name', 'version']),
            build: _.pick(this.parsed, ['generate', 'build', 'configure'])
        });
    }
    merge(other: TMake.Configuration.Cache.File): void {
        loadCache(this, other);
    }
    toCache(): TMake.Configuration.Cache.File {
        return { _id: this.hash(), project: this.project.parsed.name, cache: this.cache.toJSON() };
    }
    update() {
        return Runtime.Db.cacheConfiguration(this.toCache());
    }
    resolvePath(p: string) {
        return absolutePath(p, this.parsed.d.root);
    }
    pathSetting(val: string) { return this.resolvePath(interpolate(val, this)); }
    getProjectFile(system: string) {
        return getProjectFile(this, system);
    }
    getProjectFilePath(system: string) {
        return join(this.parsed.d.project, getProjectFile(this, system));
    }
    ensureProjectFolder() {
        mkdir('-p', this.parsed.d.project);
    }
    runPhaseWithPlugin({ phase, pluginName }: { phase: string, pluginName: string }): PromiseLike<any> {
        if (this.parsed[phase]) {
            if (!this.plugins[pluginName]) {
                const PluginConstructor = Runtime.getPlugin(pluginName);
                const options = combine(this.parsed[phase], this.parsed[phase][pluginName]);
                delete options[pluginName];
                const plugin = new PluginConstructor(this, options);
                log.verbose(`  ${phase}: ${pluginName}`, options);
                this.plugins[pluginName] = plugin;
            }
            return this.plugins[pluginName][phase]();
        } else {
            return resolve();
        }
    }
    sh(command: any) {
        const c: TMake.CmdObj = check(command, String) ?
            <TMake.CmdObj>{ cmd: command } :
            command;
        const cwd = this.pathSetting(c.cwd || this.project.parsed.d.source);
        log.verbose(`    ${c.cmd}`);
        return execAsync(
            c.cmd,
            <TMake.Shell.Exec.Options>{ cwd: cwd, silent: !args.quiet });
    }
}

export class ConfigurationPlugin extends BasePlugin {
    configuration: TMake.Configuration;
    options: any;
    toolpaths: any;
    projectFileName: string;
    buildFileName: string;

    constructor(configuration: TMake.Configuration, options?: TMake.Plugin.Configuration.Options) {
        super(configuration, options);
        this.configuration = configuration;
        const phases: TMake.Plugin.Phase[] = ['fetch', 'generate', 'configure', 'build', 'install'];
        Object.keys(configuration).forEach((phase) => {
            if (contains(phases, phase)) {
                // temp hack until proper 'stack' is built into tree parser
                Object.keys(configuration[phase]).forEach((settingKey) => {
                    // if (settingKey == this.name) extend
                    if (!Runtime.getPlugin(settingKey)) this.options[settingKey] = configuration[phase][settingKey]
                });
            }
        });
    }
}