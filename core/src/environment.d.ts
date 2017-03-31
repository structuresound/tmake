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
    select<T>(base: T, options?: Environment.Select.Options): T
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

    interface CacheFile {
      hash: string
      project: string
      cache: any
    }

    class Plugin extends TMake.Plugin {
      environment: Environment;
      options: any;
      toolpaths: any;
      projectFileName: string;
      buildFileName: string;

      constructor(env: Environment, options?: TMake.Plugin.Options)
    }

    class Cache extends TMake.Cache.Base<string> {
      env: Environment;
      assets?: TMake.Cache.Property<string>
      plugin: TMake.Cache.Base<string>
      constructor(env)
      update()
      toJSON()
    }
  }
}