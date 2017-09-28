/// <reference path="plugin.d.ts" />
/// <reference path="compiler.d.ts" />

declare namespace TMake.Plugin {
  class Ninja extends Compiler {
    options: Ninja.Options;
    constructor(environment: Configuration);
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
}

declare module 'tmake-core/ninja' {
  class Plugin extends TMake.Plugin.Ninja { }
}