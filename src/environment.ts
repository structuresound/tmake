import * as os from 'os';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import { cascade, check, clone, contains, arrayify, combine, extend, plain as toJSON, OLHM } from 'js-object-tools';
import { updateEnvironment } from './db';
import { startsWith } from './string';
import { log } from './log';
import { parseFileSync } from './file';
import { args } from './args';
import { jsonStableHash, fileHashSync, stringHash } from './hash';
import { CmdObj, iterable } from './iterate';
import { Phase } from './phase';
import { jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compiler';
import { Cache as BaseCache, CacheObject, CacheProperty } from './cache';
import { Install, InstallOptions } from './install';
import { Runtime } from './runtime';
import { Project, ProjectDirs } from './project';
import { defaults } from './defaults';
import { ExecOptions, execAsync, mkdir } from './sh';
import { parse, absolutePath, pathArray } from './parse';
import { Tools } from './tools';
import { Plugin } from './plugin';

export interface Docker {
    user: string,
    image: string,
    architecture: string,
    platform: string,
}

export interface Toolchain {
    [index: string]: any;
    host?: Platform;
    target?: Platform;
    tools?: Tools;
    outputType?: string;
    options?: OLHM<any>;
    path?: EnvironmentDirs;
    environment?: any;
    configure?: any;
    build?: any;
}

export interface Platform {
    docker?: Docker,
    architecture?: string,
    endianness?: string,
    compiler?: string
    platform?: string,
    cpu?: { num: number, speed?: string }
}

export interface EnvironmentDirs extends ProjectDirs {
    project: string;
    build: string;
    test: string;
    install: Install;
}

interface DockerOptions {
    image: string;
    args: any;
}


export class Cache extends BaseCache<string> {
    env: Environment;
    assets?: CacheProperty<string>;
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
        updateEnvironment(this.env);
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

const DEFAULT_ENV =
    parseFileSync(path.join(args.binDir, 'environment.yaml'));
const _keywords: any =
    parseFileSync(path.join(args.binDir, 'keywords.yaml'));
const defaultKeywords =
    [].concat(_.map(_keywords.host, (key) => { return `host-${key}`; }))
        .concat(_keywords.target)
        .concat(_keywords.architecture)
        .concat(_keywords.compiler)
        .concat(_keywords.sdk)
        .concat(_keywords.ide)
        .concat(_keywords.deploy);

const argvSelectors = Object.keys(_.pick(args, defaultKeywords));
argvSelectors.push(args.compiler);

function getEnvironmentDirs(pathOptions: EnvironmentDirs, projectDirs: ProjectDirs): EnvironmentDirs {
    const d = <EnvironmentDirs>clone(projectDirs);

    d.build = path.join(d.root, pathOptions.build);
    d.project = path.join(d.root, pathOptions.project || '');
    if (d.build == null) {
        d.build = path.join(projectDirs.build, pathOptions.build);
    }
    d.install = <Install>{
        binaries: _.map(arrayify(pathOptions.install.binaries), (ft: InstallOptions) => {
            return {
                matching: ft.matching,
                from: path.join(d.root, ft.from),
            };
        }),
        libraries: _.map(arrayify(pathOptions.install.libraries), (ft: InstallOptions) => {
            return {
                matching: ft.matching,
                from: path.join(d.root, ft.from),
                to: path.join(d.home, (ft.to || 'lib'))
            };
        })
    }
    if (pathOptions.install.assets) {
        d.install.assets = _.map(arrayify(pathOptions.install.assets),
            (ft: InstallOptions) => {
                return {
                    matching: ft.matching,
                    from: path.join(d.root, ft.from),
                    to: path.join(args.runDir, ft.to)
                };
            });
    }
    return d;
}


function getEnvironmentPaths(conf: EnvironmentDirs, architecture: string, outputType: string) {
    const paths = combine({
        root: '',
        test: 'build_tests'
    }, conf);

    paths.build = path.join(paths.build, architecture);

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

export class Environment implements Toolchain {
    generate: Phase;
    configure: Phase;
    build: Phase;
    path: EnvironmentDirs;
    selectors: string[];
    options: OLHM<any>;
    keywords: string[];
    d: EnvironmentDirs;
    p: EnvironmentDirs;
    s: string[];
    host: Platform;
    target: Platform;
    tools: Tools;
    _environment: any;
    environment: Environment;
    outputType: string;
    plugins: { [index: string]: Plugin }
    cache: Cache;
    project: Project;

    constructor(t: Toolchain, project: Project) {
        /* set up selectors + environment */
        this.project = project;

        const host = <Platform>combine(HOST_ENV, t.host || project.host);
        const target = <Platform>combine(DEFAULT_TARGET, t.target || project.target);
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
        this.addToEnvironment('generate', this.parse(t.generate || project.generate || {}));
        this.addToEnvironment('configure', t.configure || project.configure || {});
        this.addToEnvironment('build', t.build || project.build || {});

        this.generate = this.select(this.generate);
        this.configure = this.select(this.configure);
        this.build = this.select(this.build);

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
        return _.map(arrayify(val), (v) => { return parse(v, this); });
    }
    j() { return this.host.cpu.num; }
    hash() {
        const buildSettings = _.pick(this.environment, ['host', 'target', 'generate', 'build', 'configure']);
        const projectSettings = _.pick(this.project, ['name', 'version']);
        return jsonStableHash(combine({ environment: this._environment }, buildSettings, projectSettings));
    }
    merge(other: CacheObject) {
        mergeEnvironment(this, other);
    }
    parse(input: any, conf?: any) {
        if (conf) {
            const dict = combine(this.environment, cascade(conf, this.environment.keywords, this.environment.selectors));
            return parse(input, dict);
        }
        return parse(input, this.environment);
    }
    toCache(): CacheObject {
        return { hash: this.hash(), project: this.project.name, cache: this.cache.toJSON() };
    }
    select<T>(base: T, options: { keywords?: string[], selectors?: string[], dict?: {}, ignore?: { keywords?: string[], selectors?: string[] } } = { ignore: {} }) {
        if (!base) {
            throw new Error('selecting on empty object');
        }
        const mutableOptions = clone(options);

        mutableOptions.keywords = _.difference(this.environment.keywords, mutableOptions.ignore.keywords);
        mutableOptions.selectors = _.difference(this.environment.selectors, mutableOptions.ignore.selectors);

        const preParse = cascade(base, mutableOptions.keywords, mutableOptions.selectors);
        const parsed = this.parse(preParse, mutableOptions.dict || this.environment);
        return <T>parsed;
    }
    fullPath(p: string) {
        return absolutePath(p, this.d.root);
    }
    pathSetting(val: string) { return this.fullPath(parse(val, this)); }
    getProjectFile(system: string) {
        return getProjectFile(this, system);
    }
    getProjectFilePath(system: string) {
        return path.join(this.d.project, getProjectFile(this, system));
    }
    ensureProjectFolder() {
        mkdir('-p', this.d.project);
    }
    selectTools() {
        const buildSystems = ['cmake', 'ninja'];
        const compilers = ['clang', 'gcc', 'msvc'];

        const tools = this.select(
            DEFAULT_TOOLCHAIN,
            { dict: this, ignore: { keywords: buildSystems.concat(compilers) } });
        if (this.tools) {
            const customToolchain = this.select(
                this.tools,
                { dict: this, ignore: { keywords: buildSystems.concat(compilers) } });
            extend(tools, this.tools);
        }
        for (const name of Object.keys(tools)) {
            const tool = tools[name];
            if (tool.bin == null) {
                tool.bin = name;
            }
            if (tool.name == null) {
                tool.name = name;
            }
        }
        return tools;
    }
    runPhaseWithPlugin({ phase, pluginName }: { phase: string, pluginName: string }): PromiseLike<any> {
        if (!this.plugins[pluginName]) {
            const PluginConstructor = Runtime.getPlugin(pluginName);
            console.log('instantiate plugin:', pluginName, PluginConstructor);
            const plugin = new PluginConstructor(this, combine(this[phase], this[phase][pluginName]));
            this.plugins[pluginName] = plugin;
        }
        return this.plugins[pluginName][phase]();
    }
    sh(command: any) {
        const c: CmdObj = check(command, String) ?
            <CmdObj>{ cmd: command } :
            command;
        const cwd = this.pathSetting(c.cwd || this.project.d.source);
        log.verbose(`    ${c.cmd}`);
        return execAsync(
            c.cmd,
            <ExecOptions>{ cwd: cwd, silent: !args.quiet });
    }
}

export class EnvironmentPlugin extends Plugin {
    environment: Environment;
    options: any;
    toolpaths: any;
    projectFileName: string;
    buildFileName: string;

    constructor(env: Environment, options?: TMake.Plugin.Options) {
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