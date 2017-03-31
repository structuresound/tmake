/// <reference path="plugin.d.ts" />
/// <reference path="compiler.d.ts" />

declare namespace TMake {
  class Ninja extends TMake.Compiler {
    options: TMake.Plugin.Shell.Compiler.Ninja.Options;
    constructor(environment: Environment);
  }
  namespace Plugin {
    namespace Shell {
      namespace Compiler {
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
    }
  }
}