/// <reference path="args.d.ts" />
/// <reference path="db.d.ts" />
/// <reference path="environment.d.ts" />
/// <reference path="plugin.d.ts" />

declare namespace TMake {
  namespace Runtime {
    interface Keywords {
      environment: string[]
      host: string[]
      target: string[]
      sdk: string[]
      architecture: string[]
      compiler: string[]
      ide: string[]
      deploy: string[]
    }
  }
}

interface CPU {
  speed: number
}

interface OS {
  platform(): TMake.Trie.Environment.Platform.Name,
  arch(): TMake.Trie.Environment.Target.Architecture,
  endianness(): string,
  cpus(): CPU[]
}

interface RuntimeArgs {
  commandLine?: { [index: string]: any }, 
  database?: TMake.Database.Interface
}
declare module 'tmake-core/runtime' {
  const args: TMake.Args;
  const defaults: TMake.Defaults;

  namespace Runtime {
    export function init(runtimeArgs: RuntimeArgs);
    export function loadPlugins();
    export function j(): number;
    export const Db: TMake.Database.Interface;
    export function getPlugin(name: string): typeof TMake.Plugin;
    export const os: OS
  }

  namespace Args {
    function encode(): Buffer
    function decode(str: string): TMake.Args
  }
}
