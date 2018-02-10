/// <reference path="phase.d.ts" />
/// <reference path="install.d.ts" />
/// <reference path="cache.d.ts" />
/// <reference path="tools.d.ts" />
/// <reference path="trie.d.ts" />

declare namespace TMake {

  class Configuration {
    cache: Configuration.Cache;
    target: Trie.Target;
    product: Product;

    constructor()
    hash(): string;
    merge(other: Configuration.Cache.File): void;
    toCache(): TMake.Configuration.Cache.File;
  }

  namespace Configuration {
    interface Constructor {
      target: Trie.Target,
      product: Product 
    }
    
    interface Dirs {
      project: string
      build: string
      install: {
        libraries?: Install.Options;
        binaries?: Install.Options;
      }
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
