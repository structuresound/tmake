/// <reference path="shell.d.ts" />

declare namespace TMake.Plugin {
  class Compiler extends TMake.Plugin.Shell {
    options: Plugin.Compiler.Options;
    libs: string[];

    projectFilePath(): string;
    buildFilePath(): string;

    frameworks(): string[]
    cFlags(): string[]
    cppFlags(): string[]
    linkerFlags(): string[]
    compilerFlags(): string[]
    fetch(): any
  }

  namespace Compiler {
    interface Options extends Shell.Options {
      matching?: any;
      headers?: any;
      libs?: any;
      includeDirs?: string[];
      outputFile?: string;

      compilerFlags?: any;
      cFlags?: any;
      cppFlags?: any;
      linkerFlags?: any;
      frameworks?: any;
    }

    interface Flags {
      c?: any;
      cpp?: any;
      compiler?: any;
      linker?: any;
      frameworks?: any;
    }

    namespace Flags {
      interface MapOptions { prefix?: string, join?: string }
    }
  }
}

declare module 'tmake-core/compiler' {
  class Compiler extends TMake.Plugin.Compiler { }
  function jsonToFlags(object: any, options?: TMake.Plugin.Compiler.Flags.MapOptions);
}
