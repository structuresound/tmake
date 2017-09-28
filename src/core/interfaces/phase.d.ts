/// <reference path="ninja.d.ts" />
/// <reference path="iterate.d.ts" />

declare namespace TMake {
  interface Plugins {
    replace?: any;
    create?: any;
    shell?: any;
    ninja?: Plugin.Compiler;
  }

  interface Phase extends Plugins {
    commands: CmdObj[];
  }
}