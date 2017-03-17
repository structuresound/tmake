declare namespace TMake {


  interface Plugins {
    replace: any;
    create: any;
    ninja: Plugin.Ninja;
    cmake: Plugin.CMake;
  }

  interface SIO { [index: string]: string }

  interface Flags {
    compiler: SIO;
    linker: SIO;
    cxx: SIO;
    c: any;
    frameworks: SIO;
  }

  class Plugin {
    name: string;
    static pluginMap: { [index: string]: typeof Plugin }
    static register: (plugin: typeof Plugin) => void
    static lookup: (name: string) => typeof Plugin
    public constructor(upstream: any);
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
        flags: Flags;
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

    class Ninja extends Plugin.Shell.Compiler {
      options: Plugin.Shell.Compiler.Ninja.Options;
    }

    class CMake extends Plugin.Shell.Compiler {
      options: Plugin.Shell.Compiler.CMake.Options;
    }
  }
}