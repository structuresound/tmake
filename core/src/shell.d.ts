/// <reference path="environment.d.ts" />

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
}