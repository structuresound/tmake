import * as _ from 'lodash';
import { join } from 'path';
import * as fs from 'fs';
import { resolve } from 'bluebird';
import { cascade, check, clone, contains, map, arrayify, combine, combineN, extend, plain as toJSON, OLHM } from 'typed-json-transform';
import { startsWith } from './string';
import { log } from './log';
import { jsonStableHash, fileHashSync, stringHash } from './hash';
import { iterable } from './iterate';
import { Phase } from './phase';
import { jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compiler';
import { Cache as BaseCache, Property as CacheProperty } from './cache';
import { defaults } from './defaults';
import { Runtime, parseSelectors } from './runtime';
import { execAsync } from './shell';
import { mkdir } from 'shelljs';
import { parse, absolutePath, pathArray } from './parse';
import { Tools } from './tools';
import { Plugin as BasePlugin } from './plugin';
import { Project } from './project';
import { args } from './runtime';

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


function mergeConfiguration(a: Configuration, b: any) {
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
        if (outputType === 'executable') {
            paths.project = paths.build;
        } else {
            paths.project = paths.clone;
        }
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

export class Configuration extends Moss.Parser {
    pre: TMake.Configuration.Pre;
    post: TMake.Configuration.Post;
    cache: TMake.Configuration.Cache;
    plugins: { [index: string]: TMake.Plugin }
    project: TMake.Project;

    constructor(target: TMake.Platform, project: TMake.Project) {
        super();
        this.pre = clone(target);

        const { generate, configure, build, environment, tools, outputType } = project.post;

        this.post = <any>combine({
            generate, configure, build, environment, tools, outputType, target, host: Runtime.host
        }, { target: this.pre });

        this.project = project;
        this.plugins = {};

        this.post.environment.tools = this.selectTools();

        extend(this.post.environment, cascade(combine(Runtime.environment, this.post.environment), this.keywords, this.selectors));

        const paths = this.select(project.post.p);
        const p = getConfigurationPaths(paths, this.post.environment.target.architecture, this.post.outputType);
        const d = getConfigurationDirs(p, project.post.d);

        extend(this.post, {
            path: this.parse(paths),
            p: this.parse(p),
            d: this.parse(d),
            generate: this.select(objectify(this.post.generate)),
            configure: this.select(objectify(this.post.configure)),
            build: this.select(objectify(this.post.build))
        });
        this.cache = new Cache(this);

    }
    hash(): string {
        return jsonStableHash({
            environment: this.post.environment,
            meta: _.pick(this.project, ['name', 'version']),
            build: _.pick(this.post, ['generate', 'build', 'configure'])
        });
    }
    merge(other: Cache): void {
        mergeConfiguration(this, other);
    }
    parse(input: any, conf?: any): any {
        if (conf) {
            const selectedConf = cascade(conf, this.post.environment.keywords, this.post.environment.selectors);
            const dict = combine(this.post.environment, selectedConf);
            return parse(input, dict);
        }
        return parse(input, this.post.environment);
    }
    toCache(): TMake.Configuration.Cache.File {
        return { _id: this.hash(), project: this.project.post.name, cache: this.cache.toJSON() };
    }
    update() {
        return Runtime.Db.cacheConfiguration(this.toCache());
    }
    select(base: any, options: TMake.Configuration.Select.Options = { ignore: {} }): any {
        if (!base) {
            throw new Error('selecting on empty object');
        }
        const mutableOptions = clone(options);

        mutableOptions.keywords = _.difference(this.post.environment.keywords, mutableOptions.ignore.keywords);
        mutableOptions.selectors = _.difference(this.post.environment, mutableOptions.ignore.selectors);

        const preParse = cascade(base, mutableOptions.keywords, mutableOptions.selectors);
        const parsed = this.parse(preParse, mutableOptions.dict || this.post.environment);
        return parsed;
    }
    fullPath(p: string) {
        return absolutePath(p, this.post.d.root);
    }
    pathSetting(val: string) { return this.fullPath(parse(val, this)); }
    getProjectFile(system: string) {
        return getProjectFile(this, system);
    }
    getProjectFilePath(system: string) {
        return join(this.post.d.project, getProjectFile(this, system));
    }
    ensureProjectFolder() {
        mkdir('-p', this.post.d.project);
    }
    selectTools() {
        const compilers = ['clang', 'gcc', 'msvc'];

        const tools = this.select(Runtime.defaultToolchain, { dict: this.post.environment, ignore: { keywords: compilers } });
        if (this.post.tools) {
            const customToolchain = this.select(this.post.tools, { dict: this, ignore: { keywords: compilers } });
            extend(tools, this.post.tools);
        }
        for (const name of Object.keys(tools)) {
            const tool = tools[name];
            if (tool.name == null) {
                tool.name = name;
            }
            if (tool.bin == null) {
                tool.bin = name;
                tool.bin = Tools.pathForTool(tool);
            }
        }
        return tools;
    }
    runPhaseWithPlugin({ phase, pluginName }: { phase: string, pluginName: string }): PromiseLike<any> {
        console.log('runPhaseWithPlugin', this);
        if (this.post[phase]) {
            if (!this.plugins[pluginName]) {
                const PluginConstructor = Runtime.getPlugin(pluginName);
                const options = combine(this.post[phase], this.post[phase][pluginName]);
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
        const cwd = this.pathSetting(c.cwd || this.project.post.d.source);
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