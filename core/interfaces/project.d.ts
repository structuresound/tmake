/// <reference path="git.d.ts" />
/// <reference path="environment.d.ts" />

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

  interface Toolchain {
    [index: string]: any;
    host?: Platform;
    target?: Platform;
    tools?: Tools;
    outputType?: string;
    options?: OLHM<any>;
    path?: Environment.Dirs;
    environment?: any;
    configure?: any;
    build?: any;
  }

  class Project implements Project.File {
    [index: string]: any;
    // implements ProjectFile
    name?: string;
    override?: OLHM<Project>;
    require?: OLHM<Project>;
    cache?: Project.Cache;
    link?: string;
    git?: Git;
    archive?: string;
    version?: string;
    tag?: string;
    tree?: string;
    user?: string;
    // ephemeral
    dir?: string;
    cacheDir?: string
    toolchains?: OLHM<Toolchain>;

    // implements Toolchain
    build: any;
    configure: any;
    host: Platform;
    target: Platform;
    tools: Tools;
    outputType: Project.OutputType;
    path: Environment.Dirs;
    environment?: any;

    // runtime
    environments: Environment[];
    libs: string[];
    d: Project.Dirs;
    p: Project.Dirs;

    constructor(_projectFile: Project.File, parent?: Project)
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

    interface File extends Toolchain {
      [index: string]: any;

      // metadata
      name?: string;
      override?: OLHM<Project.File>;
      require?: OLHM<Project.File>;
      cache?: any;
      link?: string;
      git?: Git.Config;
      archive?: string;
      tree?: string;
      version?: string;
      tag?: string;
      user?: string;
      // ephemeral
      dir?: string;
      cacheDir?: string
      toolchains?: OLHM<Toolchain>;

      // implements Toolchain
      build?: any;
      configure?: any;
      host?: Platform;
      options?: OLHM<any>;
      target?: Platform;
      tools?: Tools;
      outputType?: string;
      path?: Environment.Dirs;
      environment?: any;
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
    function resolveName(project: TMake.Project | TMake.Project.File): string;
  }
}