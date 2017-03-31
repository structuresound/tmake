/// <reference path="cmake.d.ts" />
/// <reference path="ninja.d.ts" />
/// <reference path="iterate.d.ts" />

declare namespace TMake {
  interface Plugins {
    replace: any;
    create: any;
    ninja: Ninja;
    cmake: CMake;
  }

  interface Phase extends Plugins {
    /* implements Plugins */
    replace: any;
    create: any;
    shell: any;
    ninja: Ninja;
    cmake: CMake;
    /**/

    commands: CmdObj[];
  }
}