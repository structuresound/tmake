/// <reference path="phase.d.ts" />
/// <reference path="install.d.ts" />
/// <reference path="cache.d.ts" />
/// <reference path="tools.d.ts" />

declare namespace TMake {
  class Environment implements Toolchain {
    generate: Phase;
    configure: Phase;
    build: Phase;
    path: Environment.Dirs;
    selectors: string[];
    options: OLHM<any>;
    keywords: string[];
    d: Environment.Dirs;
    p: Environment.Dirs;
    s: string[];
    host: Platform;
    target: Platform;
    tools: Tools;
    _environment: any;
    environment: Environment;
    outputType: string;
    plugins: { [index: string]: Plugin }
    cache: Environment.Cache;
    project: Project;

    constructor(t: Toolchain, project: Project);
    hash(): string;
    merge(other: Environment.Cache): void;
    select(base: any, options?: Environment.Select.Options): any;
    parse(input: any, conf?: any): any;
    toCache(): TMake.Environment.Cache.File;
  }

  namespace Environment {
    interface Dirs extends Project.Dirs {
      project: string
      build: string
      test: string
      install: Install
    }

    namespace Select {
      interface Options { keywords?: string[], selectors?: string[], dict?: {}, ignore?: { keywords?: string[], selectors?: string[] } }
    }

    class Cache extends TMake.Cache.Base<string> {
      env: TMake.Environment;
      assets?: TMake.Cache.Property<string>
      plugin: TMake.Cache.Base<string>
      constructor(env)
      update()
      toJSON()
    }

    namespace Cache {
      interface File {
        _id: string
        project: string
        cache: any
      }
    }

  }

  namespace Plugin {
    class Environment extends TMake.Plugin {
      environment: TMake.Environment;
      options: any;
      toolpaths: any;
      projectFileName: string;
      buildFileName: string;

      constructor(env: Environment, options?: TMake.Plugin.Options)
    }

    namespace Environment {
      interface Options extends Plugin.Options {

      }
    }
  }
}

declare module 'tmake-core/environment' {
  class Environment extends TMake.Environment { }
  class EnvironmentPlugin extends TMake.Plugin.Environment { }
}