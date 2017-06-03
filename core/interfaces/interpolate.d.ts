declare namespace TMake {
  namespace Interpolate {
    interface Options {
      [index: string]: any;
      ref?: { [index: string]: any }
      mustPass?: boolean
    }
  }
}

declare module 'tmake-core/interpolate' {
  export function interpolate(template: string, funcOrData: Function | Object,
    mustPass?: boolean);
}