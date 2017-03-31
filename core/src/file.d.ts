declare namespace TMake {
  namespace Vinyl {
    interface File {
      path: string;
      base: string;
      cwd?: string;
    }

    interface Options {
      followSymlinks?: boolean;
      flatten?: boolean;
      relative?: string;
      from?: string;
      to?: string;
    }
  }
}