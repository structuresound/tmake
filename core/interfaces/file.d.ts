declare namespace TMake.Vinyl {
    interface File {
        path: string;
        base: string;
        cwd?: string;
    }

    interface Options {
        followSymlinks?: boolean;
        flatten?: boolean;
        relative?: string;
        from?: string;
        to?: string;
    }
}

declare module 'tmake-core/file' {
    import map = require('map-stream');
    import { dest, symlink } from 'vinyl-fs'; 
    function nuke(folderPath: string): void; 
    function prune(folderPath: string): boolean; 
    function wait(stream: any, readOnly?: boolean): Promise<any>; 
    function glob(patternS: any, relative: string, cwd: string): Promise<string[]>;
    function readIfExists(filePath: string): string; 
    function writeFileAsync(filePath: string, data: string, options?: Object): Promise<void>; 
    function getConfigPath(configDir: string): string;
    function findConfigAsync(configDir: string): Promise<string>;
    function readConfigAsync(configDir: string): Promise<string>;
    function parseFileAsync(configPath: string): Promise<string>;
    function parseFileSync(configPath: string): any;
    function readConfigSync(configDir: string): any;
    function unarchive(archive: string, tempDir: string, toDir: string, toPath?: string): Promise<any>;
    function src(glob: string[], opt: Object): NodeJS.ReadWriteStream;
    function moveArchive(tempDir: string, toDir: string, toPath: string): void;
    export { nuke, glob, unarchive, moveArchive, findConfigAsync, readConfigSync, readConfigAsync, getConfigPath, parseFileSync, parseFileAsync, writeFileAsync, src, dest, map, prune, wait, symlink };
}