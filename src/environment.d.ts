/// <reference path="./node.d.ts" /> 

interface EnvironmentDirs extends ProjectDirs {
    project: string;
    build: string;
    test: string;
    install: schema.Install;
}

interface EnvironmentModifier {
    [index: string]: any;

    $set?: Environment$Set;
    $unset?: Environment$Unset;
}

interface Environment$Unset extends Environment$Set {
    cache?: boolean;
}

interface Environment$Set {
    'cache.buildFilePath'?: string;
    'cache.generatedBuildFilePath'?: string;
    'cache.buildFile'?: string;

    'cache.build'?: string;
    'cache.configure'?: string;
    'cache.assets'?: string[];
}

declare interface EnvironmentCacheFile {
    buildFilePath?: string;
    generatedBuildFilePath?: string;
    buildFile?: string;
    build?: string;
    configure?: string;
    assets: string[];
}

declare class EnvironmentCache {
    buildFilePath: string;
    generatedBuildFilePath: CacheProperty<string>;
    buildFile: CacheProperty<string>;
    build: CacheProperty<string>;
    configure: CacheProperty<string>;
    assets: CacheProperty<string[]>;
}


declare class Environment implements schema.Toolchain {
    configure: schema.Configure;
    build: schema.Build;
    path: EnvironmentDirs;
    selectors: string[];
    d: EnvironmentDirs;
    p: EnvironmentDirs;
    s: string[];
    host: schema.Platform;
    target: schema.Platform;
    tools: schema.Tools;
    environment: any;
    outputType: string;
    cache: EnvironmentCache;

    project: Project;

    constructor(t: schema.Toolchain, project: Project);

    frameworks(): string[];
    cFlags(): string[];
    cxxFlags(): string[];
    getBuildFile(system: string): string;
    getBuildFilePath(system: string): string;
    linkerFlags(): string[];
    compilerFlags(): string[];
    includeDirs(): string[];
    id(): string;
    j(): number;
}

declare interface DockerOptions {
    image: string;
    args: any;
}
