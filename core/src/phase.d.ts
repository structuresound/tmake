/// <reference path="cmake.d.ts" />
/// <reference path="make.d.ts" />
/// <reference path="ninja.d.ts" />
/// <reference path="iterate.d.ts" />

declare namespace TMake {
  interface Plugins {
    replace?: any;
    create?: any;
    shell?: any;
    ninja?: Ninja;
    cmake?: CMake;
    make?: Make;
  }

  interface Phase extends Plugins {
    /**/

    commands: CmdObj[];
  }
}