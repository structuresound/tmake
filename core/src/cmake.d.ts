/// <reference path="plugin.d.ts" />
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
}