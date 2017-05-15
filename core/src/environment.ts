import * as os from 'os';
import * as _ from 'lodash';
import { join } from 'path';
import * as fs from 'fs';
import { cascade, check, clone, contains, map, arrayify, combine, combineN, extend, plain as toJSON, OLHM } from 'typed-json-transform';
import { startsWith } from './string';
import { log } from './log';
import { parseFileSync } from 'tmake-file';
import { jsonStableHash, fileHashSync, stringHash } from './hash';
import { iterable } from './iterate';
import { Phase } from './phase';
import { jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compiler';
import { Cache as BaseCache, Property as CacheProperty } from './cache';
import { defaults } from './defaults';
import { Runtime, Db } from './runtime';
import { execAsync } from './shell';
import { mkdir } from 'shelljs';
import { parse, absolutePath, pathArray } from './parse';
import { Tools } from './tools';
import { Plugin as BasePlugin } from './plugin';
import { Project } from './project';
import { args } from './runtime';

export class Cache extends BaseCache<string> {
    env: Environment;
    assets?: TMake.Cache.Property<string>;
    plugin: BaseCache<string>
    constructor(env) {
        super();
        this.env = env;
        this.generate = new CacheProperty<string>(() => {
            return jsonStableHash(env.generate);
        });
        this.configure = new CacheProperty<string>(() => {
            return jsonStableHash(env.configure);
        });
        this.build = new CacheProperty<string>(() => {
            return jsonStableHash(env.build);
        });
        this.assets = new CacheProperty<string>(() => {
            return "";
        });
        this
    }
    update() {
        this.env.update();
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

const platformNames = {
    linux: 'linux',
    darwin: 'mac',
    mac: 'mac',
    win: 'win',
    win32: 'win',
    ios: 'ios',
    android: 'android'
};

const additionalArchKeywords = {
    x64: 'x86_64',
    arm: 'armv7a'
}

const HOST_ENDIANNESS = os.endianness();
const HOST_PLATFORM = platformNames[os.platform()];
const HOST_COMPILER = defaults.compiler[`host-${HOST_PLATFORM}`];
const HOST_ARCHITECTURE = os.arch();
const HOST_CPU = os.cpus();

const ninjaVersion = 'v1.7.1';

const HOST_ENV = {
    architecture: HOST_ARCHITECTURE,
    compiler: HOST_COMPILER,
    endianness: HOST_ENDIANNESS,
    platform: HOST_PLATFORM,
    cpu: { num: HOST_CPU.length, speed: HOST_CPU[0].speed }
};

const DEFAULT_TARGET = {
    compiler: HOST_COMPILER,
    architecture: HOST_ARCHITECTURE,
    endianness: HOST_ENDIANNESS,
    platform: HOST_PLATFORM
};

const DEFAULT_TOOLCHAIN = {
    ninja: {
        version: ninjaVersion,
        url:
        'https://github.com/ninja-build/ninja/releases/download/${version}/ninja-${host.platform}.zip'
    },
    'host-mac': { clang: { bin: '$(which gcc)' } },
    'host-linux': { gcc: { bin: '$(which gcc)' } }
};

function mergeEnvironment(a: Environment, b: any) {
    if (!a || !b) return;
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

function parseSelectors(dict: any, prefix: string) {
    const _selectors: string[] = [];
    const selectables =
        _.pick(dict, ['platform', 'compiler', 'architecture']);
    for (const key of Object.keys(selectables)) {
        _selectors.push(`${prefix || ''}${selectables[key]}`);
    }
    return _selectors;
}


function getEnvironmentDirs(pathOptions: TMake.Environment.Dirs, projectDirs: TMake.Project.Dirs): TMake.Environment.Dirs {
    const d = <TMake.Environment.Dirs>clone(projectDirs);

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


function getEnvironmentPaths(conf: TMake.Environment.Dirs, architecture: string, outputType: string) {
    const paths = combine({
        root: '',
        test: 'build_tests'
    }, conf);

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

function getProjectFile(env: Environment, systemName: string): string {
    const buildFileNames = {
        ninja: 'build.ninja',
        cmake: 'CMakeLists.txt',
        gyp: 'binding.gyp',
        make: 'Makefile',
        tmake: 'tmake.yaml',
        xcode: `${env.project}.xcodeproj`
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

export class Environment implements TMake.Toolchain {
    generate: Phase;
    configure: Phase;
    build: Phase;
    path: TMake.Environment.Dirs;
    selectors: string[];
    options: OLHM<any>;
    keywords: string[];
    d: TMake.Environment.Dirs;
    p: TMake.Environment.Dirs;
    s: string[];
    host: TMake.Platform;
    target: TMake.Platform;
    tools: TMake.Tools;
    _environment: any;
    environment: Environment;
    outputType: string;
    plugins: { [index: string]: TMake.Plugin }
    cache: Cache;
    project: TMake.Project;
    constructor(t: TMake.Toolchain, project: TMake.Project) {
        const DEFAULT_ENV = parseFileSync(join(args.settingsDir, 'environment.yaml'));
        const _keywords = parseFileSync(join(args.settingsDir, 'keywords.yaml'));
        const defaultKeywords = [].concat(map(_keywords.host, (key) => { return `host-${key}`; }))
            .concat(_keywords.target)
            .concat(_keywords.architecture)
            .concat(_keywords.compiler)
            .concat(_keywords.sdk)
            .concat(_keywords.ide)
            .concat(_keywords.deploy);
        const argvSelectors = Object.keys(_.pick(args, defaultKeywords)).concat(args.compiler)

        /* set up selectors + environment */
        this.project = project;

        const host = <TMake.Platform>combine(HOST_ENV, t.host || project.host);
        const target = <TMake.Platform>combine(DEFAULT_TARGET, t.target || project.target);
        const hostSelectors = parseSelectors(host, 'host-');
        const targetSelectors = parseSelectors(target, undefined);
        let keywords = clone(defaultKeywords);
        let selectors = hostSelectors.concat(targetSelectors);
        const additionalOptions = cascade(t.options || {}, keywords, selectors);
        const additionalKeywords = Object.keys(additionalOptions);

        let additionalSelectors = [];
        for (const k of additionalKeywords) {
            if (additionalOptions[k]) {
                additionalSelectors.push[k];
            }
        }
        if (additionalKeywords.length) {
            keywords = keywords.concat(additionalKeywords);
            if (additionalSelectors.length) {
                selectors = this.selectors.concat(additionalSelectors);
            }
        }

        this.environment = <any>{
            host: host,
            target: target,
            keywords: keywords,
            selectors: selectors,
            options: additionalOptions
        }

        this._environment = t.environment || project.environment;
        extend(this.environment, cascade(combine(DEFAULT_ENV, this._environment), this.environment.keywords,
            this.environment.selectors));

        this.addToEnvironment('tools', this.selectTools());
        /* setup paths + directories */
        const path = this.select(combine(project.p, t.path));
        const p = getEnvironmentPaths(path, this.environment.target.architecture, project.outputType);
        const d = getEnvironmentDirs(p, project.d);


        this.addToEnvironment('path', this.parse(path));
        this.addToEnvironment('p', this.parse(p));
        this.addToEnvironment('d', this.parse(d));

        /* copy config + build settings */
        this.addToEnvironment('generate', t.generate || project.generate);
        this.addToEnvironment('configure', t.configure || project.configure);
        this.addToEnvironment('build', t.build || project.build);

        this.generate = this.select(objectify(this.generate));
        this.configure = this.select(objectify(this.configure));
        this.build = this.select(objectify(this.build));

        // log.log(this.project.name, this.configure, this.build);
        /* extend + select all remaining settings */
        const inOutFields = _.pick(project, ['outputType']);
        extend(this, this.select(inOutFields));
        if (!this.outputType) {
            this.outputType = 'static';
        }
        this.cache = new Cache(this);
        this.plugins = {};
    }
    addToEnvironment(key: string, val: any) {
        this[key] = val;
        this.environment[key] = clone(val);
    }
    globArray(val: any) {
        return map(arrayify(val), (v) => { return parse(v, this); });
    }
    j() { return this.host.cpu.num; }
    hash(): string {
        const buildSettings = _.pick(this.environment, ['host', 'target', 'generate', 'build', 'configure']);
        const projectSettings = _.pick(this.project, ['name', 'version']);
        return jsonStableHash(combineN({ environment: this._environment }, buildSettings, projectSettings));
    }
    merge(other: Cache): void {
        mergeEnvironment(this, other);
    }
    parse(input: any, conf?: any): any {
        if (conf) {
            const selectedConf = cascade(conf, this.environment.keywords, this.environment.selectors);
            const dict = combine(this.environment, selectedConf);
            return parse(input, dict);
        }
        return parse(input, this.environment);
    }
    toCache(): TMake.Environment.Cache.File {
        return { _id: this.hash(), project: this.project.name, cache: this.cache.toJSON() };
    }
    update() {
        return Db.cacheEnvironment(this.toCache());
    }
    select(base: any, options: TMake.Environment.Select.Options = { ignore: {} }): any {
        if (!base) {
            throw new Error('selecting on empty object');
        }
        const mutableOptions = clone(options);

        mutableOptions.keywords = _.difference(this.environment.keywords, mutableOptions.ignore.keywords);
        mutableOptions.selectors = _.difference(this.environment.selectors, mutableOptions.ignore.selectors);

        const preParse = cascade(base, mutableOptions.keywords, mutableOptions.selectors);
        const parsed = this.parse(preParse, mutableOptions.dict || this.environment);
        return parsed;
    }
    fullPath(p: string) {
        return absolutePath(p, this.d.root);
    }
    pathSetting(val: string) { return this.fullPath(parse(val, this)); }
    getProjectFile(system: string) {
        return getProjectFile(this, system);
    }
    getProjectFilePath(system: string) {
        return join(this.d.project, getProjectFile(this, system));
    }
    ensureProjectFolder() {
        mkdir('-p', this.d.project);
    }
    selectTools() {
        const compilers = ['clang', 'gcc', 'msvc'];

        const tools = this.select(
            DEFAULT_TOOLCHAIN,
            { dict: this, ignore: { keywords: compilers } });
        if (this.tools) {
            const customToolchain = this.select(
                this.tools,
                { dict: this, ignore: { keywords: compilers } });
            extend(tools, this.tools);
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
        if (!this.plugins[pluginName]) {
            const PluginConstructor = Runtime.getPlugin(pluginName);
            console.log('plugin options for phase', phase, combine(this[phase], this[phase][pluginName]));
            const options = combine(this[phase], this[phase][pluginName]);
            delete options[pluginName];
            const context = { [phase]: options };
            const plugin = new PluginConstructor(this, context);
            this.plugins[pluginName] = plugin;
        }
        return this.plugins[pluginName][phase]();
    }
    sh(command: any) {
        const c: TMake.CmdObj = check(command, String) ?
            <TMake.CmdObj>{ cmd: command } :
            command;
        const cwd = this.pathSetting(c.cwd || this.project.d.source);
        log.verbose(`    ${c.cmd}`);
        return execAsync(
            c.cmd,
            <TMake.Shell.Exec.Options>{ cwd: cwd, silent: !args.quiet });
    }
}

export class EnvironmentPlugin extends BasePlugin {
    environment: TMake.Environment;
    options: any;
    toolpaths: any;
    projectFileName: string;
    buildFileName: string;

    constructor(env: TMake.Environment, options?: TMake.Plugin.Environment.Options) {
        super(env, options);
        this.environment = env;
        const phases: TMake.Plugin.Phase[] = ['fetch', 'generate', 'configure', 'build', 'install'];
        Object.keys(env).forEach((phase) => {
            if (contains(phases, phase)) {
                // temp hack until proper 'stack' is built into tree parser
                Object.keys(env[phase]).forEach((settingKey) => {
                    // if (settingKey == this.name) extend
                    if (!Runtime.getPlugin(settingKey)) this.options[settingKey] = env[phase][settingKey]
                });
            }
        });
    }
}