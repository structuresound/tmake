declare namespace TMake {
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
}