/// <reference path="../node/node.d.ts" />

declare module 'ninja-build-gen' {
    function ninja_build_gen(version: string, builddir: string): any;

    export = ninja_build_gen
}

declare namespace ninja_build_gen {
    function escape(s: any): any;
}
