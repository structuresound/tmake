/// <reference path="args.d.ts" />
/// <reference path="db.d.ts" />
/// <reference path="plugin.d.ts" />

declare module 'tmake-core/runtime' {
  const args: TMake.Args;

  class Runtime {
    static Db: TMake.Database.Interface

    static init(database: TMake.Database.Interface)
    static loadPlugins(): void
    static registerPlugin(plugin: typeof Plugin): void
    static getPlugin(name: string): Plugin
  }
  namespace Args {
    function encode(): Buffer
    function decode(str: string): TMake.Args
  }
}