declare namespace TMake.Plugin {
  class CMake extends TMake.Plugin.Compiler {
    options: TMake.Plugin.CMake.Options;

    constructor(environment: TMake.Environment, options?: TMake.Plugin.CMake.Options)
  }
  namespace CMake {
    interface Options extends TMake.Plugin.Compiler.Options {
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

declare module 'tmake-plugin-cmake' {
  export class CMake extends TMake.Plugin.CMake { }
}
