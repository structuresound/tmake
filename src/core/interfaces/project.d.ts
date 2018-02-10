/// <reference path="product.d.ts" />

declare namespace TMake {
  namespace Project {
    interface Dirs {
      root : string;
      home : string;
      clone : string;
      localCache: string;
    }

    namespace Cache {
      interface File {
        meta?: string
        fetch?: string
      }
    }

    interface Cache {
      fetch : TMake.Cache.Property < string >
    }

    interface Constructor {
      trie: Trie.Project
      parent: Project
    }
  }

  class Project {
    trie: Trie.Project
    name: string
    version: string
    git: Git
    dir: string
    d: Project.Dirs
    p: Project.Dirs
    cache : Project.Cache
    library : {
      [index : string]: TMake.Product
    }
    test : {
      [index : string]: TMake.Product
    }
    binary : {
      [index : string]: TMake.Product
    }
    constructor(options: TMake.Project.Constructor);
    toCache() : TMake.Project.Cache.File
    toRegistry() : TMake.Trie.Project
  }
}

declare module 'tmake-core/project' {
  class Project extends TMake.Project {}
  namespace Project {
    function resolveName(project : TMake.Trie.Project) : string
  }
}
