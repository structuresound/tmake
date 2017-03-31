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
    [index: string]: Tool
    ninja?: Tool
    clang?: Tool
  }
}