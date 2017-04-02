declare namespace TMake {
  namespace Install {
    interface Options {
      from: string;
      to?: string;
      matching?: string[];
      includeFrom?: string;
    }

    interface CopyOptions {
      patterns: string[], from: string, to: string, opt: Vinyl.Options
    }
  }

  interface Install {
    binaries?: Install.Options[];
    headers?: Install.Options[];
    libs?: Install.Options[];
    assets?: Install.Options[];
    libraries?: Install.Options[];
  }
}