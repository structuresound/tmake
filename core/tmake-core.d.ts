declare module 'tmake-core' {
  interface SIO { [index: string]: string }

  class OLHV<T> {
    require?: string;
    value: T
  }
  class OLHM<T> {
    [index: string]: OLHV<T>;
  }

  namespace TMake {
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

    class Plugin {
      name: string;
      upstream: Object;
      options: Object;
    }


    class Ninja extends TMake.Compiler {
      options: TMake.Plugin.Shell.Compiler.Ninja.Options;
      constructor(environment: Environment);
    }

    class CMake extends Plugin.Shell.Compiler {
      options: Plugin.Shell.Compiler.CMake.Options;
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

      class Shell {

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

          namespace Ninja {
            interface Options extends Compiler.Options {
              toolchain?: {
                ninja?: {
                  version?: string;
                }
              }
            }
          }

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

    class ShellPlugin extends EnvironmentPlugin {
      options: TMake.Plugin.Shell.Options;
      constructor(env: Environment, options?: TMake.Plugin.Shell.Options)
    }

    namespace Shell {
      namespace Exec {
        interface Options {
          silent?: boolean
          cwd?: string
          short?: string
        }
      }
    }

    class Compiler extends ShellPlugin {
      options: Plugin.Shell.Compiler.Options;
      flags: Plugin.Shell.Compiler.Flags;
      libs: string[];

      constructor(environment: Environment, options?: Plugin.Shell.Compiler.Options)
    }


    interface CmdObj {
      cmd: string;
      cwd?: string;
      arg?: any;
    }

    interface Plugins {
      replace: any;
      create: any;
      ninja: Ninja;
      cmake: CMake;
    }

    interface Phase extends TMake.Plugins {
      /* implements Plugins */
      replace: any;
      create: any;
      shell: any;
      ninja: Ninja;
      cmake: CMake;
      /**/

      commands: CmdObj[];
    }

    namespace Install {
      interface Options {
        from: string;
        to?: string;
        matching?: string[];
        includeFrom?: string;
      }

      interface CopyOptions {
        patterns: string[], from: string, to: string, opt: TMake.Vinyl.Options
      }
    }

    interface Install {
      binaries?: Install.Options[];
      headers?: Install.Options[];
      libs?: Install.Options[];
      assets?: Install.Options[];
      libraries?: Install.Options[];
    }

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
      cache: Cache;
      project: Project;

      constructor(t: Toolchain, project: Project)
    }

    class EnvironmentPlugin extends Plugin {
      environment: Environment;
      options: any;
      toolpaths: any;
      projectFileName: string;
      buildFileName: string;

      constructor(env: Environment, options?: Plugin.Options)
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

    interface Project extends Project.File {
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
    }
  }

  export = TMake
}