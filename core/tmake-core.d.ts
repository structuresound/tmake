declare namespace TMake {
    interface Args {
        runDir: string;
        npmDir: string;
        binDir: string;
        settingsDir: string;
        configDir: string;
        cachePath: string;
        compiler: string;
        program: string;
        verbose: boolean;
        debug: boolean;
        dev: boolean;
        quiet: boolean;
        noDeps: boolean;
        version: boolean;
        f: string;
        force: string;
        v: boolean;
        y: boolean;
        yes: boolean;
        test: boolean;
        userCache: string;
        _: string[];
        environment: any;
    }
}declare module 'tmake-core/args' {
	/// <reference path="../src/args.d.ts" />
	export const args: TMake.Args;
	export function init(runtime: any): void;
	export function encode(): string;
	export function decode(str: any): any;

}
declare module 'tmake-core/hash' {
	export function jsonStableHash(obj: any): string;
	export function stringHash(string: string): string;
	export function fileHashSync(filePath: string): string;
	export function fileHash(filePath: string): Promise<string>;

}
declare module 'tmake-core/cache' {
	export class Property<T> {
	    require: Property<T>;
	    _value: T;
	    _get: Function;
	    _combine: Function;
	    value(): T;
	    set(val: T): void;
	    reset(): void;
	    get(): T;
	    update(): T;
	    combine(other: Property<T>): T;
	    dirty(dynamicMatch?: any): boolean;
	    constructor(getter: () => T | Promise<T>, options?: TMake.Cache.Options<T>);
	}
	export class Cache<T> {
	    fetch?: Property<T>;
	    generate?: Property<T>;
	    configure?: Property<T>;
	    build?: Property<T>;
	    install?: Property<T>;
	}

}
declare module 'tmake-core/log' {
	 class Log {
	    getMessage(...args: any[]): string;
	    log(...args: any[]): void;
	    verbose(...args: any[]): void;
	    quiet(...args: any[]): void;
	    dev(...args: any[]): void;
	    info(...args: any[]): void;
	    warn(...args: any[]): void;
	    add(...args: any[]): void;
	    error(...args: any[]): void;
	    throw(...args: any[]): void;
	    parse(...args: any[]): string;
	} const log: Log;
	export { Log, log };

}
declare module 'tmake-core/string' {
	 function startsWith(string: string, s: string): boolean; function beginsWith(string: string, s: string): boolean; function endsWith(string: string, s: string): boolean; function replaceAll(str: string, find: string, rep: string): string;
	export { startsWith, beginsWith, endsWith, replaceAll };

}
declare module 'tmake-core/plugin' {
	export class Plugin {
	    name: string;
	    upstream: Object;
	    options: Object;
	    constructor(upstream: any, options?: Object);
	    load(phase: string): void;
	    fetch(): PromiseLike<any>;
	    generate(): PromiseLike<string>;
	    configure(): PromiseLike<any>;
	    build(): PromiseLike<any>;
	    install(): PromiseLike<any>;
	}

}
declare module 'tmake-core/iterate' {
	/// <reference types="bluebird" />
	import * as Bluebird from 'bluebird';
	import { OLHM } from 'typed-json-transform';
	export function iterable(val: any): any;
	export function iterateOLHM(obj: any, fn: (any: any) => PromiseLike<any>): Bluebird<any[]>;
	export function mapOLHM<T>(obj: OLHM<T>, fn: (object: any) => PromiseLike<T>): PromiseLike<T[]>;
	export function iterate(obj: any, fn: (cmd: TMake.CmdObj) => Promise<any> | Bluebird<any>): Bluebird<TMake.CmdObj[]>;

}
declare module 'tmake-core/info' {
	export const info: {
	    fetch: {
	        nuke: (project: any) => void;
	        local: (project: any) => void;
	        dirty: (project: TMake.Project) => void;
	        url: (project: any) => void;
	        link: (project: any) => void;
	    };
	    graph: {
	        names: (graph: TMake.Project[]) => void;
	    };
	    report: (report: any) => void;
	    exit: () => void;
	};

}
declare module 'tmake-core/fetch' {
	 function download(url: string, cacheDir?: string): Promise<string>; function getSource(project: TMake.Project): Promise<string>; function linkSource(project: TMake.Project): Promise<void>; function destroy(project: TMake.Project): Promise<any>; function fetch(project: TMake.Project, isTest?: boolean): Promise<boolean>;
	export { fetch, download, getSource, linkSource, destroy };

}
declare module 'tmake-core/tools' {
	 function toolPaths(toolchain: any): TMake.Tools;
	export function pathForTool(tool: any): any; function fetchToolchain(toolchain: any): PromiseLike<TMake.Tools>;
	export { fetchToolchain as fetch, toolPaths as tools };

}
declare module 'tmake-core/interpolate' {
	export interface InterpolateOptions {
	    [index: string]: any;
	    ref?: {
	        [index: string]: any;
	    };
	    mustPass?: boolean;
	}
	export function interpolate<T>(template: T, funcOrData: Function | Object, mustPass?: boolean): T;

}
declare module 'tmake-core/parse' {
	interface MacroObject {
	    macro: string;
	    map: {
	        [index: string]: string;
	    };
	}
	interface ReplEntry {
	    inputs: any;
	    matching: any;
	    directive: {
	        prepost?: string;
	        pre?: string;
	        post?: string;
	    };
	    ext: string;
	} function absolutePath(s: string, relative?: string): string; function fullPath(p: string, root: string): string; function pathArray(val: string | string[], root: string): string[]; function parse<T, U>(input: T, ...args: U[]): T; function replaceInFile(f: string, r: ReplEntry, environment?: Object): Promise<void>;
	export { MacroObject, ReplEntry, parse, absolutePath, pathArray, fullPath, replaceInFile };

}
declare module 'tmake-core/git' {
	export function resolve(git: Git): Git;
	export class Git implements TMake.Git.Config {
	    repository: string;
	    organization: string;
	    branch: string;
	    tag: string;
	    archive?: string;
	    url?: string;
	    constructor(config: TMake.Git.Config | string);
	    version(): string;
	    name(): string;
	    clone(): string;
	    fetch(): string;
	}

}
declare module 'tmake-core/project' {
	import { OLHM } from 'typed-json-transform';
	import { Git } from 'tmake-core/git';
	export const metaDataKeys: string[];
	export const sourceKeys: string[];
	export const toolchainKeys: string[];
	export const pluginKeys: string[];
	export const dependencyKeys: string[];
	export const registryKeys: string[];
	export const ephemeralKeys: string[];
	export function resolveName(conf: TMake.Project.File | Project, fallback?: string): string;
	export function fromString(str: string): {
	    git: Git;
	};
	export class Project implements TMake.Project.File {
	    [index: string]: any;
	    name?: string;
	    override?: OLHM<Project>;
	    require?: OLHM<Project>;
	    cache?: TMake.Project.Cache;
	    link?: string;
	    git?: Git;
	    archive?: string;
	    version?: string;
	    tag?: string;
	    tree?: string;
	    user?: string;
	    dir?: string;
	    cacheDir?: string;
	    toolchains?: OLHM<TMake.Toolchain>;
	    build: any;
	    configure: any;
	    host: TMake.Platform;
	    target: TMake.Platform;
	    tools: TMake.Tools;
	    outputType: TMake.Project.OutputType;
	    path: TMake.Environment.Dirs;
	    environment?: any;
	    environments: TMake.Environment[];
	    libs: string[];
	    d: TMake.Project.Dirs;
	    p: TMake.Project.Dirs;
	    constructor(_projectFile: TMake.Project.File, parent?: Project);
	    force(): boolean;
	    url(): string;
	    safeDeps(): {};
	    merge(other: Project | Project): void;
	    toCache(): TMake.Project.File;
	    toRegistry(): Project;
	    hash(): string;
	}

}
declare module 'tmake-core/defaults' {
	export const defaults: {
	    plugins: string[];
	    compiler: {
	        'host-mac': string;
	        'host-linux': string;
	        'host-win': string;
	    };
	    flags: {
	        compiler: {
	            clang: {
	                ios: {
	                    arch: string;
	                    isysroot: string;
	                    'miphoneos-version-min': string;
	                    simulator: {
	                        'mios-simulator-version-min': string;
	                        isysroot: string;
	                    };
	                };
	            };
	        };
	        cxx: {
	            O: number;
	            mac: {
	                std: string;
	                stdlib: string;
	            };
	            linux: {
	                std: string;
	                pthread: boolean;
	            };
	        };
	        linker: {
	            linux: {
	                'lstdc++': boolean;
	                lpthread: boolean;
	            };
	            mac: {
	                'lc++': boolean;
	            };
	        };
	        frameworks: {
	            mac: {
	                CoreFoundation: boolean;
	            };
	        };
	        make: {
	            configure: {
	                'enable-static': boolean;
	                'disable-shared': boolean;
	                'with-pic': boolean;
	            };
	        };
	    };
	    assets: {
	        images: {
	            glob: string[];
	        };
	        fonts: {
	            glob: string[];
	        };
	    };
	    headers: {
	        glob: string[];
	    };
	    sources: {
	        glob: string[];
	    };
	};

}
declare module 'tmake-core/compiler' {
	import { ShellPlugin } from 'tmake-core/shell';
	export function jsonToFrameworks(object: any): string[];
	export function jsonToFlags(object: any, options?: TMake.Plugin.Shell.Compiler.Flags.MapOptions): string[];
	export function jsonToCFlags(object: any): string[];
	export class Compiler extends ShellPlugin {
	    options: TMake.Plugin.Shell.Compiler.Options;
	    flags: TMake.Plugin.Shell.Compiler.Flags;
	    libs: string[];
	    constructor(environment: TMake.Environment, options?: TMake.Plugin.Shell.Compiler.Options);
	    frameworks(): string[];
	    cFlags(): string[];
	    cxxFlags(): string[];
	    linkerFlags(): string[];
	    compilerFlags(): string[];
	    fetch(): Promise<void> | PromiseLike<TMake.Tools>;
	}

}
declare module 'tmake-core/cmake' {
	import { Compiler } from 'tmake-core/compiler';
	export function quotedList(array: string[]): string;
	export class CMake extends Compiler {
	    options: TMake.Plugin.Shell.Compiler.CMake.Options;
	    constructor(environment: TMake.Environment, options?: TMake.Plugin.Shell.Compiler.CMake.Options);
	    configureCommand(): string;
	    buildCommand(toolpaths?: string): string;
	    fetch(): PromiseLike<TMake.Tools>;
	    generate(): Promise<string>;
	}
	export default CMake;

}
declare module 'tmake-core/ninja' {
	import { Compiler } from 'tmake-core/compiler';
	export class Ninja extends Compiler {
	    options: TMake.Plugin.Shell.Compiler.Ninja.Options;
	    constructor(environment: TMake.Environment);
	    configureCommand(toolpaths: any): string;
	    buildCommand(toolpaths?: string): string;
	    fetch(): PromiseLike<TMake.Tools>;
	    generate(): Promise<string>;
	}
	export default Ninja;

}
declare module 'tmake-core/runtime' {
	import { Plugin } from 'tmake-core/plugin';
	export class Runtime {
	    static pluginMap: {
	        [index: string]: typeof Plugin;
	    };
	    static loadPlugins: (local?: string[]) => void;
	    static registerPlugin: (plugin: typeof Plugin) => void;
	    static getPlugin: (name: string) => typeof Plugin;
	}

}
declare module 'tmake-core/phase' {
	import { CMake } from 'tmake-core/cmake';
	import { Ninja } from 'tmake-core/ninja';
	export class Phase implements TMake.Plugins {
	    replace: any;
	    create: any;
	    shell: any;
	    ninja: Ninja;
	    cmake: CMake;
	    commands: TMake.CmdObj[];
	    constructor(input: any);
	}

}
declare module 'tmake-core/environment' {
	import { OLHM } from 'typed-json-transform';
	import { Phase } from 'tmake-core/phase';
	import { Cache as BaseCache } from 'tmake-core/cache';
	import { Plugin } from 'tmake-core/plugin';
	export class Cache extends BaseCache<string> {
	    env: Environment;
	    assets?: TMake.Cache.Property<string>;
	    plugin: BaseCache<string>;
	    constructor(env: any);
	    update(): void;
	    toJSON(): {};
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
	    plugins: {
	        [index: string]: Plugin;
	    };
	    cache: Cache;
	    project: TMake.Project;
	    constructor(t: TMake.Toolchain, project: TMake.Project);
	    addToEnvironment(key: string, val: any): void;
	    globArray(val: any): any[];
	    j(): number;
	    hash(): string;
	    merge(other: Cache): void;
	    parse(input: any, conf?: any): any;
	    toCache(): TMake.Environment.CacheFile;
	    select(base: any, options?: TMake.Environment.Select.Options): any;
	    fullPath(p: string): string;
	    pathSetting(val: string): string;
	    getProjectFile(system: string): string;
	    getProjectFilePath(system: string): string;
	    ensureProjectFolder(): void;
	    selectTools(): any;
	    runPhaseWithPlugin({phase, pluginName}: {
	        phase: string;
	        pluginName: string;
	    }): PromiseLike<any>;
	    sh(command: any): Promise<string>;
	}
	export class EnvironmentPlugin extends Plugin {
	    environment: TMake.Environment;
	    options: any;
	    toolpaths: any;
	    projectFileName: string;
	    buildFileName: string;
	    constructor(env: TMake.Environment, options?: TMake.Plugin.Options);
	}

}
declare module 'tmake-core/db' {
	import * as Datastore from 'nedb-promise';
	import { Mongo } from 'typed-json-transform';
	import { Environment } from 'tmake-core/environment';
	export const cache: Datastore;
	export const user: Datastore;
	export function projectNamed(name: string): PromiseLike<TMake.Project>;
	export function environmentCache(hash: string): PromiseLike<TMake.Project.Cache.File>;
	export function updateProject(node: TMake.Project, modifier: Mongo.Modifier): Promise<any>;
	export function updateEnvironment(env: Environment): PromiseLike<void>;

}
declare module 'tmake-core/errors' {
	export class TMakeError extends Error {
	    reason: Error;
	    constructor(message: string, reason?: Error);
	    postMortem(): void;
	}
	export function exit(code: any): void;
	export const errors: {
	    graph: {
	        failed: (nodes: string, error: Error) => TMakeError;
	    };
	    configure: {
	        noProjectFile: (plugin: TMake.Plugin.Shell) => never;
	    };
	    build: {
	        command: {
	            failed: (command: string, error: Error) => TMakeError;
	        };
	        noBuildFile: (plugin: TMake.Plugin.Shell) => never;
	    };
	    project: {
	        notFound: (name: string, graph?: TMake.Project[]) => void;
	        noRoot: (project: TMake.Project) => never;
	    };
	    shell: {
	        failed: (command: string, error: Error) => TMakeError;
	        report: ({command, output, cwd, short}: {
	            command: any;
	            output: any;
	            cwd: any;
	            short: any;
	        }) => Promise<any>;
	    };
	};

}
declare module 'tmake-core/shell' {
	import { cd, mv, mkdir, which, exit } from 'shelljs';
	import { Environment, EnvironmentPlugin } from 'tmake-core/environment';
	export function exec(command: string, options?: TMake.Shell.Exec.Options): string;
	export function ensureCommand(command: string): void;
	export function execAsync(command: string, {cwd, silent, short}?: TMake.Shell.Exec.Options): Promise<string>;
	export function runCommand(env: Environment, command: any): Promise<string>;
	export class ShellPlugin extends EnvironmentPlugin {
	    options: TMake.Plugin.Shell.Options;
	    constructor(env: TMake.Environment, options?: TMake.Plugin.Shell.Options);
	    configure(): Promise<void>;
	    build(): PromiseLike<any>;
	    install(): Promise<string>;
	    ensureProjectFile(isTest?: boolean): void;
	    ensureBuildFile(isTest?: boolean): void;
	    projectFilePath(): string;
	    buildFilePath(): string;
	    configureCommand(toolpaths?: string): string;
	    buildCommand(toolpaths?: string): any;
	    installCommand(toolpaths?: string): any;
	}
	export { cd, exit, mkdir, mv, which };

}
declare module 'tmake-core/graph' {
	 function loadCache(project: TMake.Project): Promise<TMake.Project>; function createNode(_conf: TMake.Project.File, parent?: TMake.Project): Promise<TMake.Project>; function deps(node: TMake.Project | TMake.Project.File): Promise<TMake.Project[]>; function resolve(conf: TMake.Project | TMake.Project.File): Promise<TMake.Project[]>;
	export { deps, createNode, loadCache, resolve as graph };

}
declare module 'tmake-core/build' {
	import { Environment } from 'tmake-core/environment';
	export function build(env: Environment, isTest?: boolean): PromiseLike<any>;

}
declare module 'tmake-core/prompt' {
	interface Prompt {
	    done: Function;
	    prompt: Function;
	    message: string;
	    start: Function;
	    yes: boolean;
	    onReceived: Function;
	    ask: Function;
	} const prompt: Prompt;
	export { Prompt, prompt };

}
declare module 'tmake-core/cloud' {
	/// <reference types="request-promise" />
	import * as request from 'request-promise';
	export function post(json: any): request.RequestPromise;
	export function get(_id: any): request.RequestPromise;
	export function login(db: any): any;

}
declare module 'tmake-core/configure' {
	import { Environment } from 'tmake-core/environment';
	export function configure(env: Environment, isTest?: boolean): PromiseLike<any>;

}
declare module 'tmake-core/generate' {
	import { Environment } from 'tmake-core/environment';
	export function generate(env: Environment, isTest?: boolean): PromiseLike<any>;

}
declare module 'tmake-core/install' {
	import { Environment } from 'tmake-core/environment';
	export function installHeaders(project: TMake.Project): PromiseLike<any>;
	export function installProject(project: TMake.Project): PromiseLike<any>;
	export function installEnvironment(env: Environment): PromiseLike<any>;

}
declare module 'tmake-core/test' {
	 function test(dep: any): void;
	export default test;

}
declare module 'tmake-core' {
	/// <reference types="bluebird" />
	import * as Bluebird from 'bluebird';
	import { init as initArgs, encode as encodeArgs, decode as decodeArgs } from 'tmake-core/args';
	import * as db from 'tmake-core/db';
	import { log } from 'tmake-core/log';
	import { info } from 'tmake-core/info';
	import { errors, TMakeError } from 'tmake-core/errors';
	import { ShellPlugin } from 'tmake-core/shell';
	import { Runtime } from 'tmake-core/runtime';
	export function execute(conf: TMake.Project.File, phase: string, subProject?: string): Promise<any>;
	export class ProjectRunner {
	    [index: string]: any;
	    project: TMake.Project;
	    constructor(node: TMake.Project);
	    do(fn: Function, opt?: any): Bluebird<TMake.Environment[]>;
	    fetch(isTest?: boolean): Promise<boolean>;
	    generate(isTest?: boolean): Promise<boolean>;
	    configure(isTest?: boolean): Promise<boolean>;
	    build(isTest?: boolean): Promise<boolean>;
	    all(): Promise<boolean>;
	    install(): Promise<boolean>;
	    test(): Promise<void>;
	    link(): Promise<TMake.Project[]>;
	    clean(): Bluebird<number>;
	}
	export function unlink(config: TMake.Project.File): Promise<{}>;
	export function push(config: TMake.Project.File): void;
	export function list(repo: string, selector: Object): Promise<TMake.Project.File[]>;
	export function findAndClean(depName: string): PromiseLike<TMake.Project.File>;
	export class TMake extends ShellPlugin {
	    constructor(env: TMake.Environment);
	    configureCommand(): string;
	    buildCommand(): string;
	    installCommand(): string;
	}
	export { log, db, Runtime, info, errors, TMakeError };
	export { initArgs, encodeArgs, decodeArgs };

}
declare module 'tmake-core/make' {
	import { Compiler } from 'tmake-core/compiler';
	export function generate(node: any): Promise<string>;
	export function install(node: any): Promise<string>;
	export class Make extends Compiler {
	    options: TMake.Plugin.Shell.Compiler.Make.Options;
	    constructor(environment: TMake.Environment, options?: TMake.Plugin.Shell.Compiler.Make.Options);
	    configureCommand(toolpaths: any): string;
	    buildCommand(toolpaths?: string): string;
	    installCommand(): string;
	}

}
declare namespace TMake {
  namespace Git {
    interface Config {
      repository?: string;
      organization?: string;
      branch?: string;
      tag?: string;
      archive?: string;
      url?: string;
    }
  }

  class Git implements Git.Config {
    repository: string;
    organization: string;
    branch: string;
    tag: string;
    archive?: string;
    url?: string;
    constructor(config: Git.Config | string)
    version()
    name()
    clone()
    fetch()
  }
}declare namespace TMake {
  class Plugin {
    name: string;
    upstream: Object;
    options: Object;

    public constructor(upstream: any, options?: Object);
    public load(phase: string);
    public fetch(): PromiseLike<any>;
    public generate(): PromiseLike<string>;
    public configure(): PromiseLike<any>;
    public build(): PromiseLike<any>;
    public install(): PromiseLike<any>;
  }

  namespace Plugin {
    type Phase = 'fetch' | 'generate' | 'configure' | 'build' | 'install';

    interface StepOptions {
      environment?: any;
      cmd?: any;
      arguments?: any;
      flags?: any;
    }

    interface Options {
      fetch?: any;
      generate?: StepOptions;
      configure?: StepOptions;
      build?: StepOptions;
      install?: StepOptions;
    }

    namespace Shell {
      interface Options extends Plugin.Options {
        defines?: any;
        arguments?: any;
        prefix?: any;
        toolchain?: {
          [index: string]: {
            version?: string;
          }
        }
      }

      class Compiler extends Shell {
        options: Plugin.Shell.Compiler.Options;
        flags: Plugin.Shell.Compiler.Flags;
        libs: string[];
      }

      namespace Compiler {
        interface Options extends Shell.Options {
          cFlags?: any;
          cxxFlags?: any;
          compilerFlags?: any;
          linkerFlags?: any;

          frameworks?: any;
          matching?: any;
          headers?: any;
          libs?: any;
          includeDirs?: string[];
          outputFile?: string;
        }

      }
    }
  }
}/// <reference path="environment.d.ts" />

declare namespace TMake {
  namespace Shell {
    namespace Exec {
      interface Options {
        silent?: boolean
        cwd?: string
        short?: string
      }
    }
  }
  namespace Plugin {
    class Shell extends TMake.Environment.Plugin {
      options: Plugin.Shell.Options;
      constructor(env: Environment, options?: TMake.Plugin.Shell.Options)

      projectFilePath(): string;
      buildFilePath(): string;
      configureCommand(toolpaths?: string): string;
      buildCommand(toolpaths?: string): string;
      installCommand(toolpaths?: string): string;
    }
  }
}/// <reference path="shell.d.ts" />

declare namespace TMake {
  class Compiler extends TMake.Plugin.Shell {
    options: Plugin.Shell.Compiler.Options;
    flags: Plugin.Shell.Compiler.Flags;
    libs: string[];

    constructor(environment: Environment, options?: Plugin.Shell.Compiler.Options)
  }

  namespace Plugin {
    namespace Shell {
      namespace Compiler {
        interface Flags {
          compiler: SIO;
          linker: SIO;
          cxx: SIO;
          c: any;
          frameworks: SIO;
        }

        namespace Flags {
          interface MapOptions { prefix?: string, join?: string }
        }
      }
    }
  }
}/// <reference path="plugin.d.ts" />
/// <reference path="compiler.d.ts" />

declare namespace TMake {
  class CMake extends Compiler {
    options: TMake.Plugin.Shell.Compiler.CMake.Options;

    constructor(environment: TMake.Environment, options?: TMake.Plugin.Shell.Compiler.CMake.Options)
  }

  namespace Plugin {
    namespace Shell {
      namespace Compiler {
        namespace CMake {
          interface Options extends Compiler.Options {
            cmake: {
              minimumVersion: string;
              version: string;
            },
            toolchain?: {
              ninja?: {
                version?: string;
              }
            }
          }
        }
      }
    }
  }
}/// <reference path="plugin.d.ts" />
/// <reference path="compiler.d.ts" />

declare namespace TMake {
    class Make extends Compiler {
        options: TMake.Plugin.Shell.Compiler.Make.Options;

        constructor(environment: Environment, options?: TMake.Plugin.Shell.Compiler.Make.Options)
    }

    namespace Plugin {
        namespace Shell {
            namespace Compiler {
                namespace Make {
                    interface Options extends Compiler.Options {
                        make: {
                            flags: any;
                            version: string;
                        }
                    }
                }
            }
        }
    }
}/// <reference path="plugin.d.ts" />
/// <reference path="compiler.d.ts" />

declare namespace TMake {
  class Ninja extends TMake.Compiler {
    options: TMake.Plugin.Shell.Compiler.Ninja.Options;
    constructor(environment: Environment);
  }
  namespace Plugin {
    namespace Shell {
      namespace Compiler {
        namespace Ninja {
          interface Options extends Compiler.Options {
            toolchain?: {
              ninja?: {
                version?: string;
              }
            }
          }
        }
      }
    }
  }
}declare namespace TMake {
  interface CmdObj {
    cmd: string;
    cwd?: string;
    arg?: any;
  }
}/// <reference path="cmake.d.ts" />
/// <reference path="make.d.ts" />
/// <reference path="ninja.d.ts" />
/// <reference path="iterate.d.ts" />

declare namespace TMake {
  interface Plugins {
    replace?: any;
    create?: any;
    shell?: any;
    ninja?: Ninja;
    cmake?: CMake;
    make?: Make;
  }

  interface Phase extends Plugins {
    /**/

    commands: CmdObj[];
  }
}declare namespace TMake {
  namespace Install {
    interface Options {
      from: string;
      to?: string;
      matching?: string[];
      includeFrom?: string;
    }

    interface CopyOptions {
      patterns: string[], from: string, to: string, opt: Vinyl.Options
    }
  }

  interface Install {
    binaries?: Install.Options[];
    headers?: Install.Options[];
    libs?: Install.Options[];
    assets?: Install.Options[];
    libraries?: Install.Options[];
  }
}declare namespace TMake {
  namespace Cache {
    interface Options<T> {
      require?: Property<T>;
      value?: T;
      combine?: () => T;
    }

    class Property<T> {
      require: Property<T>;
      _value: T;
      _get: Function;
      _combine: Function;
      value(): T
      set(val: T): void
      reset(): void
      get(): T
      update(): T
      combine(other: Property<T>): T
      dirty(dynamicMatch?: any): boolean
      constructor(getter: () => T | Promise<T>, options?: Options<T>)
    }

    class Base<T> {
      fetch?: Property<T>;
      generate?: Property<T>;
      configure?: Property<T>;
      build?: Property<T>;
      install?: Property<T>;
    }
  }
}declare namespace TMake {
  interface Tool {
    url: string
    version: string
    bin?: string
    name?: string
  }

  namespace Tools {
    interface Docker {
      user: string
      image: string
      architecture: string
      platform: string
    }

    namespace Docker {
      interface Options {
        image: string
        args: any
      }
    }
  }

  interface Tools {
    [index: string]: Tool
    ninja?: Tool
    clang?: Tool
  }
}/// <reference path="phase.d.ts" />
/// <reference path="install.d.ts" />
/// <reference path="cache.d.ts" />
/// <reference path="tools.d.ts" />

declare namespace TMake {
  class Environment implements Toolchain {
    generate: Phase;
    configure: Phase;
    build: Phase;
    path: Environment.Dirs;
    selectors: string[];
    options: OLHM<any>;
    keywords: string[];
    d: Environment.Dirs;
    p: Environment.Dirs;
    s: string[];
    host: Platform;
    target: Platform;
    tools: Tools;
    _environment: any;
    environment: Environment;
    outputType: string;
    plugins: { [index: string]: Plugin }
    cache: Environment.Cache;
    project: Project;

    constructor(t: Toolchain, project: Project);
    hash(): string;
    merge(other: Environment.Cache): void;
    select(base: any, options?: Environment.Select.Options): any;
    parse(input: any, conf?: any): any;
  }


  namespace Environment {
    interface Dirs extends Project.Dirs {
      project: string
      build: string
      test: string
      install: Install
    }

    namespace Select {
      interface Options { keywords?: string[], selectors?: string[], dict?: {}, ignore?: { keywords?: string[], selectors?: string[] } }
    }

    interface CacheFile {
      hash: string
      project: string
      cache: any
    }

    class Plugin extends TMake.Plugin {
      environment: Environment;
      options: any;
      toolpaths: any;
      projectFileName: string;
      buildFileName: string;

      constructor(env: Environment, options?: TMake.Plugin.Options)
    }

    class Cache extends TMake.Cache.Base<string> {
      env: Environment;
      assets?: TMake.Cache.Property<string>
      plugin: TMake.Cache.Base<string>
      constructor(env)
      update()
      toJSON()
    }
  }
}/// <reference path="git.d.ts" />
/// <reference path="environment.d.ts" />

declare namespace TMake {
  class OLHV<T> {
    require?: string;
    value: T
  }
  class OLHM<T> {
    [index: string]: OLHV<T>;
  }

  interface Platform {
    docker?: Tools.Docker,
    architecture?: string,
    endianness?: string,
    compiler?: string
    platform?: string,
    cpu?: { num: number, speed?: string }
  }

  interface Toolchain {
    [index: string]: any;
    host?: Platform;
    target?: Platform;
    tools?: Tools;
    outputType?: string;
    options?: OLHM<any>;
    path?: Environment.Dirs;
    environment?: any;
    configure?: any;
    build?: any;
  }

  namespace Project {
    type OutputType = "static" | "dynamic" | "executable";

    interface Dirs {
      root: string;
      home: string;
      clone: string;
      source: string;
      build: string;
      install: Install;
      includeDirs: string[];
      localCache: string;
    }

    interface File extends Toolchain {
      [index: string]: any;

      // metadata
      name?: string;
      override?: OLHM<Project.File>;
      require?: OLHM<Project.File>;
      cache?: any;
      link?: string;
      git?: Git.Config;
      archive?: string;
      tree?: string;
      version?: string;
      tag?: string;
      user?: string;
      // ephemeral
      dir?: string;
      cacheDir?: string
      toolchains?: OLHM<Toolchain>;

      // implements Toolchain
      build?: any;
      configure?: any;
      host?: Platform;
      options?: OLHM<any>;
      target?: Platform;
      tools?: Tools;
      outputType?: string;
      path?: Environment.Dirs;
      environment?: any;
    }

    interface Cache {
      fetch: TMake.Cache.Property<string>;
      metaData?: TMake.Cache.Property<string>;
      metaConfiguration?: TMake.Cache.Property<string>;
      bin?: TMake.Cache.Property<string>;
      libs?: TMake.Cache.Property<string[]>;
    }

    namespace Cache {
      interface File {
        [index: string]: any;

        fetch?: string;
        metaData?: string;
        metaConfiguration?: string;
        bin?: string;
        libs?: string[];
      }
    }
  }

  class Project implements Project.File {
    [index: string]: any;
    // implements ProjectFile
    name?: string;
    override?: OLHM<Project>;
    require?: OLHM<Project>;
    cache?: Project.Cache;
    link?: string;
    git?: Git;
    archive?: string;
    version?: string;
    tag?: string;
    tree?: string;
    user?: string;
    // ephemeral
    dir?: string;
    cacheDir?: string
    toolchains?: OLHM<Toolchain>;

    // implements Toolchain
    build: any;
    configure: any;
    host: Platform;
    target: Platform;
    tools: Tools;
    outputType: Project.OutputType;
    path: Environment.Dirs;
    environment?: any;

    // runtime
    environments: Environment[];
    libs: string[];
    d: Project.Dirs;
    p: Project.Dirs;

    constructor(_projectFile: Project.File, parent?: Project)
  }
}/// <reference path="project.d.ts" />

declare namespace TMake {
    interface SIO { [index: string]: string }


}declare module 'json-stable-stringify' {
    function stringify(jsopn: any): string;
    export = stringify
}declare module 'map-stream' {
  function map_stream(mapper: Function, opts?: Object): NodeJS.ReadWriteStream;

  export = map_stream;
}declare module "nedb-promise" {
  class DataStore {
    constructor();
    constructor(path: string);
    constructor(options: NeDBPromise.DataStoreOptions);

    persistence: NeDBPromise.Persistence;

    /**
     * Load the database from the datafile, and trigger the execution of
     * buffered commands if any
     */
    loadDatabase(): Promise<void>;

    /**
     * Get an array of all the data in the database
     */
    getAllData(): Array<any>;


    /**
     * Reset all currently defined indexes
     */
    resetIndexes(newData: any): void;

    /**
     * Ensure an index is kept for this field. Same parameters as lib/indexes
     * For now this function is synchronous, we need to test how much time it
     * takes
     * We use an async API for consistency with the rest of the code
     * @param {String} options.fieldName
     * @param {Boolean} options.unique
     * @param {Boolean} options.sparse
     * @param {Function} cb Optional callback, signature: err
     */
    ensureIndex(options: NeDBPromise.EnsureIndexOptions): Promise<void>;

    /**
     * Remove an index
     * @param {String} fieldName
     * @param {Function} cb Optional callback, signature: err
     */
    removeIndex(fieldName: string): Promise<void>;

    /**
     * Add one or several document(s) to all indexes
     */
    addToIndexes<T>(doc: T): void;
    addToIndexes<T>(doc: Array<T>): void;

    /**
     * Remove one or several document(s) from all indexes
     */
    removeFromIndexes<T>(doc: T): void;
    removeFromIndexes<T>(doc: Array<T>): void;

    /**
     * Update one or several documents in all indexes
     * To update multiple documents, oldDoc must be an array of { oldDoc, newDoc
     * } pairs
     * If one update violates a constraint, all changes are rolled back
     */
    updateIndexes<T>(oldDoc: T, newDoc: T): void;
    updateIndexes<T>(updates: Array<{
      oldDoc: T;
      newDoc: T;
    }>): void;

    /**
     * Return the list of candidates for a given query
     * Crude implementation for now, we return the candidates given by the first
     *usable index if any
     * We try the following query types, in this order: basic match, $in match,
     *comparison match
     * One way to make it better would be to enable the use of multiple indexes
     *if the first usable index
     * returns too much data. I may do it in the future.
     *
     * TODO: needs to be moved to the Cursor module
     */
    getCandidates(query: any): void;

    /**
     * Insert a new document
     * @param {Function} cb Optional callback, signature: err, insertedDoc
     */
    insert<T>(newDoc: T): Promise<T>;

    /**
     * Count all documents matching the query
     * @param {any} query MongoDB-style query
     */
    count(query: any): Promise<number>;
    count(query: any): NeDBPromise.CursorCount;

    /**
     * Find all documents matching the query
     * If no callback is passed, we return the cursor so that user can limit,
     * skip and finally exec
     * @param {any} query MongoDB-style query
     * @param {any} projection MongoDB-style projection
     */
    find<T>(query: any, projection: T): Promise<Array<T>>;
    find<T>(query: any, projection: T): NeDBPromise.Cursor<T>;

    /**
     * Find all documents matching the query
     * If no callback is passed, we return the cursor so that user can limit,
     * skip and finally exec
     * * @param {any} query MongoDB-style query
     */
    find<T>(query: any): Promise<Array<T>>;
    find<T>(query: any): NeDBPromise.Cursor<T>;

    /**
     * Find one document matching the query
     * @param {any} query MongoDB-style query
     * @param {any} projection MongoDB-style projection
     */
    findOne<T>(query: any, projection: T): Promise<T>;

    /**
     * Find one document matching the query
     * @param {any} query MongoDB-style query
     */
    findOne<T>(query: any): Promise<T>;

    /**
     * Update all docs matching query
     * For now, very naive implementation (recalculating the whole database)
     * @param {any} query
     * @param {any} updateQuery
     * @param {Object} options Optional options
     *                 options.multi If true, can update multiple documents
     *(defaults to false)
     *                 options.upsert If true, document is inserted if the query
     *doesn't match anything
     * @param {Function} cb Optional callback, signature: numReplaced, affected
     *docs, upsert (set to true if the update was in fact an upsert)
     *
     * @api private Use Datastore.update which has the same signature
     */
    update(query: any, updateQuery: any,
           options?: NeDBPromise.UpdateOptions): Promise<any>;

    /**
     * Remove all docs matching the query
     * For now very naive implementation (similar to update)
     * @param {Object} query
     * @param {Object} options Optional options
     *                 options.multi If true, can update multiple documents
     *(defaults to false)
     * @param {Function} cb Optional callback, signature: err, numRemoved
     *
     * @api private Use Datastore.remove which has the same signature
     */
    remove(query: any, options: NeDBPromise.RemoveOptions): Promise<number>;
    remove(query: any): Promise<number>;
  }

  namespace DataStore {}
  export = DataStore;
}


declare namespace NeDBPromise {
  interface Cursor<T> {
    sort(query: any): Cursor<T>;
    skip(n: number): Cursor<T>;
    limit(n: number): Cursor<T>;
    projection(query: any): Cursor<T>;
    exec(callback: (err: Error, documents: Array<T>) => void): void;
  }

  interface CursorCount {
    exec(callback: (err: Error, count: number) => void): void;
  }

  interface DataStoreOptions {
    filename?:string // Optional, datastore will be in-memory only if not provided
  inMemoryOnly?:boolean // Optional, default to false
  nodeWebkitAppName?:boolean // Optional, specify the name of your NW app if you want options.filename to be relative to the directory where
  autoload?:boolean // Optional, defaults to false
  onload?:(error:Error)=>any // Optional, if autoload is used this will be called after the load database with the error object as parameter. If you don't pass it the error will be thrown
  afterSerialization?:(line:string)=>string; // (optional): hook you can use to transform data after it was serialized and before it is written to disk. Can be used for example to encrypt data before writing database to disk. This function takes a string as parameter (one line of an NeDB data file) and outputs the transformed string, which must absolutely not contain a \n character (or data will be lost)
    beforeDeserialization?: (line: string) =>
        string;  // (optional): reverse of afterSerialization. Make sure to
                 // include both and not just one or you risk data loss. For the
                 // same reason, make sure both functions are inverses of one
                 // another. Some failsafe mechanisms are in place to prevent
                 // data loss if you misuse the serialization hooks: NeDB checks
                 // that never one is declared without the other, and checks
                 // that they are reverse of one another by testing on random
                 // strings of various lengths. In addition, if too much data is
                 // detected as corrupt, NeDB will refuse to start as it could
                 // mean you're not using the deserialization hook corresponding
                 // to the serialization hook used before (see below)
    corruptAlertThreshold?: number;  // (optional): between 0 and 1, defaults to
                                     // 10%. NeDB will refuse to start if more
                                     // than this percentage of the datafile is
                                     // corrupt. 0 means you don't tolerate any
                                     // corruption, 1 means you don't care
  }

  /**
  * multi (defaults to false) which allows the modification of several documents
  * if set to true
  * upsert (defaults to false) if you want to insert a new document
  * corresponding to the update rules if your query doesn't match anything
  */
  interface UpdateOptions {
    multi?: boolean;
    upsert?: boolean;
    returnUpdatedDocs?: boolean
  }

  /**
  * options only one option for now: multi which allows the removal of multiple
  * documents if set to true. Default is false
  */
  interface RemoveOptions { multi?: boolean }

  interface EnsureIndexOptions {
    fieldName: string;
    unique?: boolean;
    sparse?: boolean;
  }

  interface Persistence {
    compactDatafile(): void;
    setAutocompactionInterval(interval: number): void;
    stopAutocompaction(): void;
  }
}declare module 'request-progress' {
    function request_progress(request: any, options: any): any;
    export = request_progress
}