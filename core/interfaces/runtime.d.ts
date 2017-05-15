/// <reference path="args.d.ts" />
/// <reference path="db.d.ts" />
/// <reference path="plugin.d.ts" />

declare module 'tmake-core/runtime' {
  namespace Runtime {
    function init(args: TMake.Args, db: TMake.Db)
    function loadPlugins(): void
    function registerPlugin(plugin: typeof Plugin): void
    function getPlugin(name: string): Plugin
  }

  namespace Args {
    export function encode(): Buffer
    export function decode(str: string): TMake.Args
  }
}