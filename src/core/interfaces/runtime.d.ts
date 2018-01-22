/// <reference path="args.d.ts" />
/// <reference path="db.d.ts" />
/// <reference path="defaults.d.ts" />
/// <reference path="plugin.d.ts" />

declare namespace TMake {
  interface Settings {
    keywords: Runtime.Keywords
    plugins: { [index: string]: string }
    defaults: TMake.Defaults
    // =hidden // platform: any
  }

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
  platform(): string,
  arch(): TMake.Target.Architecture,
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
