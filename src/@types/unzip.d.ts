interface ExtractOptions {
    path: string
}
declare module 'unzip' {
    function Extract(options: ExtractOptions): NodeJS.WritableStream;
}
