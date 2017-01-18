/// <reference path="./schema.d.ts" /> 
/// <reference path="./cache.d.ts" /> 
/// <reference path="./environment.d.ts" />

declare interface SafeDep {
    name: string;
    hash: string;
}

declare class DebugCache {
    url?: string;
    metaConfiguration?: Object
}

declare class ProjectCache {
    fetch: CacheProperty<string>;
    metaData?: CacheProperty<string>;
    metaConfiguration?: CacheProperty<string>;
    bin?: CacheProperty<string>;
    libs?: CacheProperty<string[]>;
}

interface Project$Set {
    libs?: string[];

    'cache.fetch'?: string;
    'cache.metaData'?: string;
    'cache.metaConfiguration'?: string;
    'cache.libs'?: string[];
    'cache.buildFile'?: string;
    'cache.bin'?: string;
}

interface Project$Unset extends Project$Set {
    cache?: boolean;
}

interface ProjectModifier {
    [index: string]: any;

    $set?: Project$Set;
    $unset?: Project$Unset;
}

interface ProjectDirs {
    root: string;
    home: string;
    clone: string;
    source: string;
    install: schema.Install;
    includeDirs: string[];
}

interface OLHV<T> {
    require?: string;
    value: T
}
interface OLHM<T> {
    [index: string]: OLHV<T>;
}

declare interface ProjectFile extends schema.Toolchain {
    [index: string]: any;

    // metadata
    name?: string;
    override?: Project;
    deps?: Project[];
    cache?: any;
    link?: string;
    git?: schema.Git;
    archive?: { url?: string; }
    version?: string;
    tag?: string;
    user?: string;
    dir?: string;
    toolchains?: OLHM<schema.Toolchain>;

    // implements Toolchain
    build: schema.Build;
    configure: schema.Configure;
    host: schema.Platform;
    target: schema.Platform;
    tools: schema.Tools;
    outputType: string;
    path: EnvironmentDirs;
    environment?: any;
}

declare class Project implements ProjectFile {
    [index: string]: any;
    // implements ProjectFile
    name?: string;
    override?: Project;
    deps?: Project[];
    cache?: ProjectCache;
    link?: string;
    git?: schema.Git;
    archive?: { url?: string; }
    version?: string;
    tag?: string;
    user?: string;
    dir?: string;
    toolchains?: OLHM<schema.Toolchain>;

    // implements Toolchain
    build: schema.Build;
    configure: schema.Configure;
    host: schema.Platform;
    target: schema.Platform;
    tools: schema.Tools;
    outputType: string;
    path: EnvironmentDirs;
    environment?: any;

    // runtime
    environments: Environment[];
    libs: string[];
    d: ProjectDirs;
    p: ProjectDirs;

    constructor(_projectFile: ProjectFile, parent?: Project);

    force(): boolean;
}