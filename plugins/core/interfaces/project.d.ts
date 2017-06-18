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
    compiler?: string
    platform?: string,
    cpu?: { num: number, speed?: string }
  }

  namespace Yaml {
    interface Configuration {
      environment?: any;
      path?: Configuration.Dirs;
    }

    interface Phases {
      build?: Phase;
      generate?: Phase;
      configure?: Phase;
    }

    interface Toolchain {
      target?: Platform;
      tools?: Tools;
      outputType?: string;
    }

    interface File extends Configuration, Phases, Toolchain {
    }
  }


  class Project extends Moss.Parser {
    pre: Project.Pre
    post: Project.Post

    cache: Project.Cache

    constructor(_projectFile: Project.Pre, parent?: Project)
    force(): void
    url(): string
    safeDeps(): { [index: string]: TMake.Project.Cache.File }
    merge(other: Project | Project): void
    toCache(): TMake.Project.Pre
    toRegistry(): TMake.Project.Pre
    hash(): string
  }

  namespace Project {
    type OutputType = "static" | "dynamic" | "executable";

    interface Dirs {
      root: string;
      home: string;
      clone: string;
      source: string;
      build: string;
      install: Install;
      includeDirs: string[];
      localCache: string;
    }

    interface Meta {
      // metadata
      name?: string;
      override?: OLHM<Project.Pre>;
      require?: OLHM<Project.Pre>;
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

    interface Pre extends Meta, Yaml.File, Moss.Layer {
      targets?: OLHM<TMake.Platform>
      hash?: string
    }

    interface Post extends Meta, Yaml.File {
      configurations: TMake.Configuration[];
      git: TMake.Git
      libs: string[];
      d: TMake.Project.Dirs;
      p: TMake.Project.Dirs;
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
    function resolveName(project: TMake.Project | TMake.Project.Pre): string;
  }
}