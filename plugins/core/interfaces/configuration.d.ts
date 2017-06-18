/// <reference path="phase.d.ts" />
/// <reference path="install.d.ts" />
/// <reference path="cache.d.ts" />
/// <reference path="tools.d.ts" />
/// <reference path="moss.d.ts" />

declare namespace TMake {
  class Configuration extends Moss.Parser {
    pre: Configuration.Pre;
    post: Configuration.Post;
    cache: Configuration.Cache;
    project: Project;

    constructor(t: Yaml.File, project: Project);
    hash(): string;
    merge(other: Configuration.Cache): void;
    select(base: any, options?: Configuration.Select.Options): any;
    parse(input: any, conf?: any): any;
    toCache(): TMake.Configuration.Cache.File;
  }

  namespace Configuration {

    interface Dirs extends Project.Dirs {
      project: string
      build: string
      test: string
      install: Install
    }

    interface Pre extends Yaml.File, Moss.Layer {

    }

    interface Post extends Yaml.File {
      d: Configuration.Dirs;
      p: Configuration.Dirs;
      s: string[];
    }

    namespace Select {
      interface Options { keywords?: string[], selectors?: string[], dict?: {}, ignore?: { keywords?: string[], selectors?: string[] } }
    }

    class Cache extends TMake.Cache.Base<string> {
      configuration: TMake.Configuration.Pre;
      assets?: TMake.Cache.Property<string>
      plugin: TMake.Cache.Base<string>
      constructor(configuration)
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
    class Configuration extends TMake.Plugin {
      configuration: TMake.Configuration;
      options: any;
      toolpaths: any;
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