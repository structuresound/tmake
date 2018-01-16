/// <reference types="tmake-core" />

declare namespace TMake.Plugin {
  class CMake extends TMake.Plugin.Compiler {
    options: TMake.Plugin.CMake.Options;

    constructor(environment: TMake.Configuration, options?: TMake.Plugin.CMake.Options)
  }
  namespace CMake {
    interface Options extends TMake.Plugin.Compiler.Options {
      minimumVersion: string,
      version: string,
      defines: string[],
      toolchain?: Tool,
      ninja?: Tool
    }
  }
}

declare module 'tmake-plugin-cmake' {
  export class CMake extends TMake.Plugin.CMake { }
}
