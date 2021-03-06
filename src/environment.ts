import * as os from 'os';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import { cascade, check, clone, arrayify, combine, extend, plain as toJSON, OLHM } from 'js-object-tools';

import { startsWith } from './string';
import { log } from './log';
import { parseFileSync } from './file';
import { args } from './args';
import { mkdir } from './sh';
import { parse, absolutePath, pathArray } from './parse';
import { jsonStableHash, fileHashSync, stringHash } from './hash';
import { CmdObj, iterable, getCommands } from './iterate';
import { jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compilerFlags';

import { CacheProperty } from './cache';
import { Build } from './build';
import { Configure } from './configure';
import { Install, InstallOptions } from './install';
import { Project, ProjectDirs } from './project';
import { defaults } from './defaults';
import { Tools } from './tools';

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
    configure?: Configure;
    build?: Build;
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

export interface EnvironmentModifier {
    [index: string]: any;

    $set?: Environment$Set;
    $unset?: Environment$Unset;
}

interface DockerOptions {
    image: string;
    args: any;
}

export interface Environment$Unset extends Environment$Set {
    cache?: boolean;
}

export interface Environment$Set {
    'cache.buildFilePath'?: string;
    'cache.generatedBuildFilePath'?: string;
    'cache.buildFile'?: string;
    'cache.cmake'?: string;

    'cache.build'?: string;
    'cache.configure'?: string;
    'cache.assets'?: string[];
}

export interface EnvironmentCacheFile {
    [index: string]: any;
    _id?: string,
    hash?: string,
    project?: string,
    cache?: {
        buildFilePath?: string;
        generatedBuildFilePath?: string;
        buildFile?: string;
        build?: string;
        cmake?: string;
        configure?: string;
        assets?: string[];
    }
}

export interface EnvironmentCache {
    [index: string]: CacheProperty<any>;

    buildFilePath: CacheProperty<string>;
    generatedBuildFilePath: CacheProperty<string>;
    buildFile: CacheProperty<string>;
    build: CacheProperty<string>;
    configure: CacheProperty<string>;
    assets: CacheProperty<string[]>;
    cmake: CacheProperty<string>;
    make: CacheProperty<string>;
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
const HOST_ARCHITECTURE = os.arch();
const HOST_CPU = os.cpus();

const ninjaVersion = 'v1.7.1';

const settings: any = parseFileSync(path.join(args.binDir, 'settings.yaml'));

const HOST_ENV = {
    architecture: HOST_ARCHITECTURE,
    endianness: HOST_ENDIANNESS,
    compiler: settings.defaultCompiler[HOST_PLATFORM],
    platform: HOST_PLATFORM,
    cpu: { num: HOST_CPU.length, speed: HOST_CPU[0].speed }
};

const DEFAULT_TARGET = {
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
const keywords =
    [].concat(_.map(_keywords.host, (key) => { return `host-${key}`; }))
        .concat(_keywords.target)
        .concat(_keywords.architecture)
        .concat(_keywords.build)
        .concat(_keywords.compiler)
        .concat(_keywords.sdk)
        .concat(_keywords.ide)
        .concat(_keywords.deploy);

const argvSelectors = Object.keys(_.pick(args, keywords));
argvSelectors.push(args.compiler);

function getEnvironmentDirs(env: Environment, projectDirs: ProjectDirs): EnvironmentDirs {
    const pathOptions = env.p;
    const d = <EnvironmentDirs>clone(projectDirs);

    d.project = path.join(d.root, pathOptions.project || '');
    if (d.build == null) {
        d.build = path.join(d.root, pathOptions.build);
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


function getEnvironmentPaths(env: Environment, projectPaths: ProjectDirs) {
    const defaultPaths = combine({
        root: '',
        test: 'build_tests'
    }, projectPaths);
    const paths = <EnvironmentDirs>extend(defaultPaths, env.path);
    if (!check(paths.build, String)) {
        paths.build = path.join(paths.root, 'build', env.target.architecture);
    }
    if (!check(paths.project, String)) {
        if (env.project.outputType === 'executable') {
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

function parseBuild(env: Environment, config: Build) {
    const b = env.select(config);

    const cFlags = b.cFlags || b.cxxFlags || {};
    const cxxFlags = b.cxxFlags || b.cFlags || {};
    const linkerFlags = b.linkerFlags || {};
    const compilerFlags = b.compilerFlags || {};

    b.compilerFlags = _.extend(env.select(defaults.flags.compiler), compilerFlags);
    b.linkerFlags = _.extend(env.select(defaults.flags.linker), linkerFlags);
    b.cxxFlags = _.extend(env.select(defaults.flags.cxx), cxxFlags);
    b.cFlags = _.omit(_.extend(env.select(defaults.flags.cxx), cFlags), ['std', 'stdlib']);
    b.frameworks = env.select(b.frameworks || env.select(defaults.flags.frameworks) || {});

    env.build = b;
}

class Environment implements Toolchain {
    configure: Configure;
    build: Build;
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
    environment: any;
    outputType: string;
    cache: EnvironmentCache;

    project: Project;

    _configure: Configure;
    _build: Build;

    constructor(t: Toolchain, project: Project) {
        /* set up selectors + environment */
        this.project = project;
        this.host = <Platform>combine(HOST_ENV, t.host || project.host);
        this.target = <Platform>combine(DEFAULT_TARGET, t.target || project.target);

        const hostSelectors = parseSelectors(this.host, 'host-');
        const targetSelectors = parseSelectors(this.target, undefined);
        this.selectors = hostSelectors.concat(targetSelectors);
        this.keywords = keywords;
        const additionalOptions = cascade(this.options || {}, keywords, this.selectors);
        const additionalKeywords = Object.keys(additionalOptions);
        let additionalSelectors = [];
        for (const k of additionalKeywords) {
            if (additionalOptions[k]) {
                additionalSelectors.push[k];
            }
        }
        if (additionalKeywords.length) {
            this.keywords = this.keywords.concat(additionalKeywords);
            if (additionalSelectors.length) {
                this.selectors = this.selectors.concat(additionalSelectors);
            }
        }

        const environment = cascade(combine(DEFAULT_ENV, t.environment || project.environment), keywords,
            this.selectors);
        extend(this, environment);
        this.tools = this.selectTools();

        /* setup paths + directories */
        this.path = this.select(t.path || project.path || {});
        this.p = getEnvironmentPaths(this, project.p);
        this.d = getEnvironmentDirs(this, project.d);

        /* copy config + build settings */
        this._configure = combine(project.configure || t.configure);
        this.configure = this.select(this._configure);
        this._build = combine(project.build || t.build)
        parseBuild(this, this._build);

        /* extend + select all remaining settings */
        const inOutFields = _.pick(project, ['outputType']);
        extend(this, this.select(inOutFields));
        if (!this.outputType) {
            this.outputType = 'static';
        }

        const self = this;
        this.cache = {
            configure: new CacheProperty<string>(() => {
                return jsonStableHash(self.configure);
            }),
            build: new CacheProperty<string>(() => {
                return jsonStableHash(self.build);
            }),
            buildFile: new CacheProperty<string>(() => {
                if (self.build.with) {
                    return fileHashSync(self.getProjectFilePath(self.build.with));
                }
                return "";
            }),
            buildFilePath: new CacheProperty<string>(() => {
                return self.getProjectFilePath(self.build.with);
            }),
            cmake: new CacheProperty<string>(() => {
                return fileHashSync(path.join(self.d.build, 'build.ninja'));
            }),
            make: new CacheProperty<string>(() => {
                return fileHashSync(path.join(self.d.project, 'Makefile'));
            }),
            generatedBuildFilePath: new CacheProperty<string>(() => {
                if (self.configure.for) {
                    return self.getProjectFilePath(self.configure.for);
                }
                return "";
            }),
            assets: new CacheProperty<string[]>(() => {
                return [""];
            })
        }
        this.cache.configure.require = this.cache.buildFile;
    }

    frameworks() { return jsonToFrameworks(this.build.frameworks); }
    cFlags() { return jsonToCFlags(this.build.cFlags); }
    cxxFlags() { return jsonToCFlags(this.build.cxxFlags); }
    linkerFlags() { return jsonToFlags(this.build.linkerFlags); }
    compilerFlags() { return jsonToFlags(this.build.compilerFlags, { join: ' ' }); }
    includeDirs() { return iterable(this.build.includeDirs); }
    globArray(val: any) {
        return _.map(arrayify(val), (v) => { return parse(v, this); });
    }
    j() { return this.host.cpu.num; }
    hash() {
        const env = _.pick(this, ['host', 'target']);
        const phases = { build: this._build, configure: this._configure };
        const projectSettings = _.pick(this.project, ['name', 'version']);
        return jsonStableHash(combine(env, phases, projectSettings));
    }
    merge(other: EnvironmentCacheFile) {
        mergeEnvironment(this, other);
    }
    parse(input: any, conf?: any) {
        if (conf) {
            const dict = combine(this, cascade(conf, keywords, this.selectors));
            return parse(input, dict);
        }
        return parse(input, this);
    }
    toCache(): EnvironmentCacheFile {
        const ret: EnvironmentCacheFile = { hash: this.hash(), project: this.project.name, cache: {} };
        for (const k of Object.keys(this.cache)) {
            const v = this.cache[k].value();
            if (v) {
                log.dev(`cache <-- ${k}: ${v}`);
                ret.cache[k] = v;
            }
        }
        return ret;
    }
    select(base: any, options: { keywords?: string[], selectors?: string[], dict?: {}, ignore?: { keywords?: string[], selectors?: string[] } } = { ignore: {} }) {
        if (!base) {
            throw new Error('selecting on empty object');
        }
        const mutableOptions = clone(options);

        mutableOptions.keywords = _.difference(keywords, mutableOptions.ignore.keywords);
        mutableOptions.selectors = _.difference(this.selectors, mutableOptions.ignore.selectors);

        const preParse = cascade(base, mutableOptions.keywords, mutableOptions.selectors);
        const parsed = this.parse(preParse, mutableOptions.dict || this);
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
        return path.join(this.d.project, getProjectFile(this, system));
    }
    ensureProjectFolder() {
        if (!fs.existsSync(this.d.project)) {
            mkdir('-p', this.d.project);
        }
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
    getConfigurationIterable(): CmdObj[] { return getCommands(this.configure); }
}

export {
    Environment, CacheProperty, keywords, argvSelectors
}