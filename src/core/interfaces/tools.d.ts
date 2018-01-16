declare namespace TMake {
  interface Tool {
    url: string
    version: string
    bin?: string
    name?: string
  }

  namespace Tools {
    interface Docker {
      user: string
      image: string
      architecture: string
      platform: string
    }

    namespace Docker {
      interface Options {
        image: string
        args: any
      }
    }
  }

  interface Tools {
    ninja?: Tool
    clang?: Tool
    cmake?: Tool
    gcc?: Tool
  }
}

declare module 'tmake-core/tools' {
  namespace Tools {
    function tools(toolchain: any): TMake.Tools
    function pathForTool(tool: any): string
    function fetchAndUnarchive(tool: any): PromiseLike<void>
    function fetch(toolchain: any): PromiseLike<string>
  }
}
