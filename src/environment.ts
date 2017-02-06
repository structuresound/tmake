import * as os from 'os';
import * as _ from 'lodash';
import * as path from 'path';
import { check, clone, arrayify, combine, extend, plain as toJSON } from 'js-object-tools';

import cascade from './cascade';
import { startsWith } from './string';
import { log } from './log';
import { parseFileSync } from './file';
import { args } from './args';
import { parse, absolutePath, pathArray } from './parse';
import { jsonStableHash, fileHash, stringHash } from './hash';
import { CmdObj, iterable, getCommands } from './iterate';
import { stdCxxFlags, stdFrameworks, stdLinkerFlags, stdCompilerFlags, jsonToFrameworks, jsonToCFlags, jsonToFlags } from './compilerFlags';

import { CacheProperty } from './cache';
import { Build } from './build';
import { Configure } from './configure';
import { Install, InstallOptions } from './install';
import { Project, ProjectDirs } from './project';
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

    'cache.build'?: string;
    'cache.configure'?: string;
    'cache.assets'?: string[];
}

export interface EnvironmentCacheFile {
    [index: string]: any;

    buildFilePath?: string;
    generatedBuildFilePath?: string;
    buildFile?: string;
    build?: string;
    configure?: string;
    assets?: string[];
}

export interface EnvironmentCache {
    [index: string]: CacheProperty<any>;

    buildFilePath: CacheProperty<string>;
    generatedBuildFilePath: CacheProperty<string>;
    buildFile: CacheProperty<string>;
    build: CacheProperty<string>;
    configure: CacheProperty<string>;
    assets: CacheProperty<string[]>;
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

const archNames = { x64: 'x86_64', arm: 'armv7a', arm64: 'arm64' };

const HOST_ENDIANNESS = os.endianness();
const HOST_PLATFORM = platformNames[os.platform()];
const HOST_ARCHITECTURE = archNames[os.arch()];
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
        'https://github.com/ninja-build/ninja/releases/download/{version}/ninja-{host.platform}.zip'
    },
    'host-mac': { clang: { bin: '$(which gcc)' } },
    'host-linux': { gcc: { bin: '$(which gcc)' } }
};

function parseSelectors(dict: any, prefix: string) {
    const _selectors: string[] = [];
    const selectables =
        _.pick(dict, ['platform', 'compiler']);
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
                sources: ft.sources,
                from: path.join(d.root, ft.from),
                to: path.join(d.root, (ft.to || 'bin'))
            };
        }),
        libraries: _.map(arrayify(pathOptions.install.libraries), (ft: InstallOptions) => {
            return {
                sources: ft.sources,
                from: path.join(d.root, ft.from),
                to: path.join(d.home, (ft.to || 'lib'))
            };
        })
    }
    if (pathOptions.install.assets) {
        d.install.assets = _.map(arrayify(pathOptions.install.assets),
            (ft: InstallOptions) => {
                return {
                    sources: ft.sources,
                    from: path.join(d.root, ft.from),
                    to: path.join(d.root, (ft.to || 'bin'))
                };
            });
    }
    return d;
}


function getEnvironmentPaths(env: Environment, projectPaths: ProjectDirs) {
    const defaultPaths = combine(projectPaths, {
        root: '',
        project: 'source',
        test: 'build_tests'
    });

    const paths = <EnvironmentDirs>extend(defaultPaths, env.path);
    console.log('arch', env.target.architecture);
    if (paths.build == null) {
        paths.build = path.join(paths.root, 'build', env.target.architecture);
    }
    if (paths.install.libraries == null) {
        paths.install.libraries = [{ from: paths.build }];
    }
    if (paths.install.binaries == null) {
        paths.install.binaries = [{ from: paths.build, to: 'bin' }];
    }
    return paths;
};

function getBuildFile(env: Environment, systemName: string): string {
    const buildFileNames = {
        ninja: 'build.ninja',
        cmake: 'CMakeLists.txt',
        gyp: 'binding.gyp',
        make: 'Makefile',
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

    b.compilerFlags = _.extend(env.select(stdCompilerFlags), compilerFlags);
    b.linkerFlags = _.extend(env.select(stdLinkerFlags), linkerFlags);
    b.cxxFlags = _.extend(env.select(stdCxxFlags), cxxFlags);
    b.cFlags = _.omit(_.extend(env.select(stdCxxFlags), cFlags), ['std', 'stdlib']);
    b.frameworks = env.select(b.frameworks || env.select(stdFrameworks) || {});

    env.build = b;
}

class Environment implements Toolchain {
    configure: Configure;
    build: Build;
    path: EnvironmentDirs;
    selectors: string[];
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

    constructor(t: Toolchain, project: Project) {
        // 1. set up selectors + environment
        this.project = project;
        this.host = <Platform>combine(HOST_ENV, t.host || project.host);
        this.target = <Platform>combine(DEFAULT_TARGET, t.target || project.target);

        const hostSelectors = parseSelectors(this.host, 'host-');
        const targetSelectors = parseSelectors(this.target, undefined);
        this.selectors = hostSelectors.concat(targetSelectors);

        const environment =
            cascade.deep(combine(DEFAULT_ENV, project.environment), keywords,
                this.selectors);
        extend(this, environment);

        this.tools = this.selectTools();
        // 2. setup paths + directories
        this.path = this.select(t.path || project.path || {});
        this.p = getEnvironmentPaths(this, project.p);
        this.d = getEnvironmentDirs(this, project.d);
        const mainOperations = _.pick(project, ['configure', 'build']);
        extend(this, this.select(mainOperations));
        this.configure = this.select(combine(project.configure || t.configure));
        parseBuild(this, <Build>combine(project.build || t.build));
        // 3. extend + select all remaining settings
        const inOutFields = _.pick(project, ['outputType']);
        extend(this, this.select(inOutFields));
        if (!this.outputType) {
            this.outputType = 'static';
        }

        this.cache = {
            configure: new CacheProperty<string>(() => {
                return jsonStableHash(this.configure);
            }),
            build: new CacheProperty<string>(() => {
                return jsonStableHash(this.build);
            }),
            buildFile: new CacheProperty<string>(() => {
                return fileHash(this.getBuildFilePath(this.build.with));
            }),
            buildFilePath: new CacheProperty<string>(() => {
                return this.getBuildFilePath(this.build.with);
            }),
            generatedBuildFilePath: new CacheProperty<string>(() => {
                return this.getBuildFilePath(this.configure.for);
            }),
            assets: new CacheProperty<string[]>(() => {
                return [""];
            })
        }
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
    id() {
        return jsonStableHash(_.pick(this, ['host', 'target', 'build', 'configure']));
    }
    parse(input: any, conf?: any) {
        if (conf) {
            const dict =
                combine(this, cascade.deep(conf, keywords, this.selectors));
            return parse(input, dict);
        }
        return parse(input, this);
    }
    safe(): Environment {
        const plain = <Environment>_.omit(
            toJSON(this), ['project']);
        return plain;
    }
    select(base: any, options: { keywords?: string[], selectors?: string[], dict?: {}, ignore?: { keywords?: string[], selectors?: string[] } } = { ignore: {} }) {
        if (!base) {
            throw new Error('selecting on empty object');
        }
        const mutableOptions = clone(options);

        mutableOptions.keywords =
            _.difference(keywords, mutableOptions.ignore.keywords);
        mutableOptions.selectors =
            _.difference(this.selectors, mutableOptions.ignore.selectors);

        const flattened =
            cascade.deep(base, mutableOptions.keywords, mutableOptions.selectors);
        const parsed = this.parse(flattened, mutableOptions.dict);
        return parsed;
    }
    fullPath(p: string) {
        return absolutePath(p, this.d.root);
    }
    pathSetting(val: string) { return this.fullPath(parse(val, this)); }
    getBuildFile(system: string) {
        return getBuildFile(this, system);
    }
    getBuildFilePath(system: string) {
        return path.join(this.d.project, getBuildFile(this, system));
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