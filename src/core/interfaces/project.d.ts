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

  namespace Target {
    type Architecture = 'x86' | 'arm64' | 'armv7'
    type Endianness = 'BE' | 'LE'
    interface File {
      architecture?: Target.Architecture
      endianness?: Target.Endianness
      options?: {[index: string]: boolean}
    }
  }

  interface Target extends Target.File {
    platform?: Platform.Name
    flags?: TMake.Plugin.Compiler.Flags
  }

  namespace Platform {
    type Name = 'mac' | 'win' | 'linux' | 'ios' | 'android'
    interface File {[index: string]: Target.File}
  }

  interface Platform {[index: string]: Target}

  namespace Platforms {
    interface File {[index: string]: Platform.File}
  }
  
  interface Platforms {
    [index: string]: Platform
  }

  interface Host extends TMake.Target {
    architecture: Target.Architecture,
    compiler?: 'clang' | 'gcc' | 'msvc' | 'ic',
    cpu?: { num: number, speed?: number }
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
      environment?: { [index: string]: any }
      options?: { [index: string]: boolean }
      path?: Configuration.Dirs;
      target?: TMake.Source.TargetOptions
    }

    interface Phases {
      build?: Phase;
      generate?: Phase;
      configure?: Phase;
      test?: Phase;
      run?: TMake.Platforms.File;
    }

    interface Project extends Meta, Configuration, Phases {
    }
  }

  interface ProjectOptions {
    projectFile?: TMake.Project.Raw,
    extendFile?: TMake.Project.Raw,
    parent?: Project,
    test?: boolean
  }

  class Project {
    raw: Project.Raw
    parsed: Project.Parsed
    dependencies: { [index: string]: TMake.Project }
    cache: Project.Cache

    constructor(options: ProjectOptions)
    init(parent?: Project, test?: boolean): void
    force(): void
    url(): string
    safeDeps(): { [index: string]: TMake.Project.Cache.File }
    loadCache(cache: TMake.Project.Cache.File): void
    toCache(): TMake.Project.Raw
    toRegistry(): TMake.Project.Raw
    testProject(): TMake.Project
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
      hash?: string;
    }

    namespace Parsed {
      interface Platform {[index: string]: TMake.Configuration}
      interface Platforms {[index: string]: Platform}
    }

    interface Parsed extends Raw {
      git?: TMake.Git
      libs?: string[];
      d?: TMake.Project.Dirs;
      p?: TMake.Project.Dirs;
      platforms?: Parsed.Platforms;
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
