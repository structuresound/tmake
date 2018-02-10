/// <reference path="git.d.ts" />

declare namespace TMake {
  namespace Trie {
    namespace Target {
      type Architecture = 'x86' | 'arm64' | 'armv7'
      type Endianness = 'BE' | 'LE'
    }

    namespace Platform {
      type Name = 'mac' | 'win' | 'linux' | 'ios' | 'android'
    }

    interface Target {
      platform?: Platform.Name
      architecture?: Target.Architecture
      endianness?: Target.Endianness
      glob?: any
      path?: any
      sdk?: any
      flags?: TMake.Plugin.Compiler.Flags
    }

    interface Platform {
      [index : string] : Target
    }
    interface Platforms {
      [index : string] : Platform
    }

    interface Host extends Target {
      architecture : Target.Architecture,
      compiler?: 'clang' | 'gcc' | 'msvc' | 'ic',
      cpu?: {
        num: number,
        speed?: number
      }
    }

    interface Environment {
      host : Host,
      tools?: Tools
      target : {
        binary: Platforms,
        lib: Platforms,
        test: Platforms
      }
    }

    namespace Product {
      interface Meta {
        // metadata
        require?: OLHM < File >,
        path?: TMake.Product.Dirs,
        options?: any,
        glob?: any,
        output?: {
          type: 'static' | 'dynamic' | 'executable',
          lipo?: boolean
        }
      }

      interface Phases {
        generate?: Phase;
        configure?: Phase;
        build?: Phase;
        run?: Phase;
      }

      interface Glob {
        assets?: {
          images: string[],
          fonts: string[]
        }
        headers?: any
      }
    }
    interface Product extends Product.Meta,
    Product.Phases {}

    interface Git {
      repository : string;
      organization : string;
      branch?: string;
      tag?: string;
      archive?: string;
      url?: string;
    }

    namespace Project {
      interface Package {
        name?: string;
        user?: string;
        tag?: string;
      }
    }

    interface Project extends Project.Package {
      override?: OLHM < File >,
      cache?: any,
      link?: string,
      git?: Git,
      archive?: string,
      version?: string,
      dir?: string,
      path: TMake.Project.Dirs,
      binary: {
        [index : string]: Product
      }
      lib: {
        [index : string]: Product
      }
      test: {
        [index : string]: Product
      }
    }
  }
}
