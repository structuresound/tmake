declare module 'decompress' {
  function decompress(src: string, dest: string): PromiseLike<string[]>;
  export = decompress;
}