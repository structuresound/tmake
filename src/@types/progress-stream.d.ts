interface ProgressStream {
    length: number,
    time: number
}

declare module 'progress-stream' {
    function progressStream(options: ProgressStream): NodeJS.ReadWriteStream;
    export = progressStream;
}