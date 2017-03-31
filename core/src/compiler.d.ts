/// <reference path="shell.d.ts" />

declare namespace TMake {
  class Compiler extends Shell.Plugin {
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
}