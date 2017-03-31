declare module 'read-chunk' {
    function sync(filePath: string, start: number, end: number): Buffer;
}