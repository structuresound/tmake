declare module 'lzma' {
    function decompress(data: Buffer, callback: Function);
    function compress(data: Buffer, level: number, callback: Function);
}