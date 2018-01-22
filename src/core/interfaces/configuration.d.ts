/// <reference path="phase.d.ts" />
/// <reference path="install.d.ts" />
/// <reference path="cache.d.ts" />
/// <reference path="tools.d.ts" />


declare namespace TMake {
  class Configuration {
    parsed: Configuration.Parsed;
    cache: Configuration.Cache;
    project: Project;

    constructor(target: Target, state: any, parent: TMake.Project)
    hash(): string;
    merge(other: Configuration.Cache.File): void;
    toCache(): TMake.Configuration.Cache.File;
  }

  namespace Configuration {
    interface Dirs extends Project.Dirs {
      project: string
      build: string
      test: string
      install: Install
    }

    interface Parsed extends Source.Project {
      target: TMake.Target & TMake.Source.TargetOptions
      d: Configuration.Dirs
      p: Configuration.Dirs
      s: string[]
    }

    namespace Select {
      interface Options { keywords?: string[], selectors?: string[], dict?: {}, ignore?: { keywords?: string[], selectors?: string[] } }
    }

    class Cache extends TMake.Cache.Base<string> {
      configuration: TMake.Configuration;
      assets?: TMake.Cache.Property<string>
      libs?: TMake.Cache.Property<string[]>
      checksums?: TMake.Cache.Property<string[]>
      plugin: TMake.Cache.Base<string>
      constructor(configuration)
      update(): PromiseLike<any>
      toJSON()
    }

    namespace Cache {
      interface File {
        _id: string,
        project: string,
        version: string,
        platform: string,
        architecture: string,
        date: Date,
        cache: {
          libs: {[index: string]: string},
          checksums: {[index: string]: string}
        }
      }
    }
  }

  namespace Plugin {
    class Configuration extends TMake.Plugin {
      configuration: TMake.Configuration;
      options: any;
      projectFileName: string;
      buildFileName: string;

      constructor(configuration: Configuration, options?: TMake.Plugin.Options)
    }

    namespace Configuration {
      interface Options extends Plugin.Options {

      }
    }
  }
}

declare module 'tmake-core/configuration' {
  class Configuration extends TMake.Configuration { }
  class ConfigurationPlugin extends TMake.Plugin.Configuration { }
}
