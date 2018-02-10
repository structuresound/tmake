/// <reference path="configuration.d.ts" />
/// <reference path="install.d.ts" />

declare namespace TMake {
  namespace Product {
    interface Dirs {
      source : string,
      includeDirs : string[],
      install: {
        headers?: Install.Options;
        assets?: Install.Options;
      }
    }

    interface Cache {
      metaData?: TMake.Cache.Property < string >,
      metaConfiguration?: TMake.Cache.Property < string >,
      bin?: TMake.Cache.Property < string >,
      libs?: TMake.Cache.Property < string[] >
    }

    namespace Cache {
      interface File extends TMake.Trie.Product {
        metaData?: string,
        metaConfiguration?: string
      }
    }

    interface Constructor {
      trie?: TMake.Trie.Product,
      inherit?: TMake.Trie.Product
      project?: Project,
      build?: TMake.Trie.Platforms
    }

    interface Platform {
      [index : string] : TMake.Configuration
    }

    interface Platforms {
      [index: string]: Platform
    }
  }

  class Product {
    trie : Trie.Product 
    project: TMake.Project
    platforms : {
      [index : string]: Product.Platform
    }
    dependencies : {
      [index : string]: TMake.Product
    }

    name?: string
    cache : Product.Cache
    libs?: string[]
    d?: TMake.Product.Dirs
    p?: TMake.Product.Dirs

    constructor(options : Product.Constructor)
    init(options : Product.Constructor) : void
    force() : void
    url() : string
    safeDeps() : {
      [index : string]: TMake.Product.Cache.File
    }
    loadCache(cache : TMake.Product.Cache.File) : void
    toCache() : TMake.Product.Cache.File
    testProject() : TMake.Product
    hash() : string
  }
}

declare module 'tmake-core/product' {
  class Product extends TMake.Product {}
}
