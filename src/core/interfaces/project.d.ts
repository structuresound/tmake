/// <reference path="git.d.ts" />
/// <reference path="configuration.d.ts" />

declare namespace TMake {
  class OLHV<T> {
    require?: string;
    value: T
  }
  class OLHM<T> {
    [index: string]: OLHV<T>;
  }

  interface Platform {
    docker?: Tools.Docker,
    architecture?: string,
    endianness?: string,
    platform?: string,
    options?: {[index: string]: boolean},
    cpu?: { num: number, speed?: number }
  }

  interface HostPlatform extends Platform {
    compiler?: string
    tools?: TMake.Tools
  }

  interface TargetPlatform extends Platform {
    flags?: TMake.Plugin.Compiler.Flags
  }

  namespace Source {
    interface Meta {
      // metadata
      name?: string;
      override?: OLHM<Project.Raw>;
      require?: OLHM<Project.Raw>;
      cache?: any;
      link?: string;
      git?: Git.Config;
      archive?: string;
      tree?: string;
      version?: string;
      tag?: string;
      user?: string;
      dir?: string
    }

    interface TargetOptions {
      glob?: Defaults.Glob
      sdk?: any
      flags?: any
      output?: {
        type: "static" | "dynamic" | "executable";
        lipo?: boolean
      }
    }

    interface Configuration {
      options?: { [index: string]: boolean }
      path?: Configuration.Dirs;
      target?: TargetOptions
    }

    interface Phases {
      build?: Phase;
      generate?: Phase;
      configure?: Phase;
    }

    interface Project extends Meta, Configuration, Phases {
    }
  }

  class Project {
    raw: Project.Raw
    parsed: Project.Parsed
    dependencies: { [index: string]: TMake.Project }
    cache: Project.Cache

    constructor(_projectFile: Project.Raw, parent?: Project)
    force(): void
    url(): string
    safeDeps(): { [index: string]: TMake.Project.Cache.File }
    loadCache(cache: TMake.Project.Cache.File): void
    toCache(): TMake.Project.Raw
    toRegistry(): TMake.Project.Raw
    hash(): string
  }

  namespace Project {
    

    interface Dirs {
      root: string;
      home: string;
      clone: string;
      source: string;
      build: string;
      headers: string;
      install: Install;
      includeDirs: string[];
      localCache: string;
    }

    interface Raw extends Source.Project {
      hash?: string
    }

    interface Parsed extends Raw {
      git?: TMake.Git
      libs?: string[];
      d?: TMake.Project.Dirs;
      p?: TMake.Project.Dirs;
      configurations?: TMake.Configuration[];
    }

    interface Cache {
      fetch: TMake.Cache.Property<string>;
      metaData?: TMake.Cache.Property<string>;
      metaConfiguration?: TMake.Cache.Property<string>;
      bin?: TMake.Cache.Property<string>;
      libs?: TMake.Cache.Property<string[]>;
    }

    namespace Cache {
      interface File {
        [index: string]: any;

        fetch?: string;
        metaData?: string;
        metaConfiguration?: string;
        bin?: string;
        libs?: string[];
      }
    }
  }
}

declare module 'tmake-core/project' {
  class Project extends TMake.Project { }
  namespace Project {
    function resolveName(project: TMake.Project | TMake.Project.Raw): string;
  }
}
