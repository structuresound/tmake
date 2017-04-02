declare module 'map-stream' {
  function map_stream(mapper: Function, opts?: Object): NodeJS.ReadWriteStream;

  export = map_stream;
}