/// <reference path="file.d.ts" />

declare namespace TMake {
  namespace Install {
    interface Options {
      from: string;
      to?: string;
      matching?: string[];
      includeFrom?: string;
    }

    interface CopyOptions {
      patterns: string[], from: string, to: string, opt: TMake.Vinyl.Options
    }
  }
}
