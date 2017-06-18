/// <reference path="args.d.ts" />
/// <reference path="db.d.ts" />
/// <reference path="plugin.d.ts" />

declare namespace TMake {
  interface Settings {
    keywords: Runtime.Keywords
    environment: Runtime.Environment
    host?: TMake.Platform
    plugins?: {
      [index: string]: TMake.Plugin
    }
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

    interface Environment {
      [index: string]: string
    }

    interface Host extends TMake.Platform {
      cpu: { num: number, speed: string }
      selectors: string
    }

  }
}

declare module 'tmake-core/runtime' {
  const args: TMake.Args;

  class Runtime {
    static Db: TMake.Database.Interface

    static init(database: TMake.Database.Interface)
    static loadPlugins(): void
    static j(): number
    static registerPlugin(plugin: typeof Plugin): void
    static getPlugin(name: string): Plugin

    static keywords: TMake.Runtime.Keywords;
    static environment: TMake.Runtime.Keywords;
    static host: TMake.Runtime.Host
    static defaultTarget: TMake.Platform
  }

  namespace Args {
    function encode(): Buffer
    function decode(str: string): TMake.Args
  }
}