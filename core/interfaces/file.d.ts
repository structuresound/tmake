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
    export { map, dest, symlink };
    export function nuke(folderPath: string): void;
    export function prune(folderPath: string): boolean;
    export function wait(stream: any, readOnly?: boolean): Promise<any>;
    export function glob(patternS: any, relative: string, cwd: string): Promise<string[]>;
    export function readIfExists(filePath: string): string;
    export function writeFileAsync(filePath: string, data: string, options?: Object): Promise<void>;
    export function getConfigPath(configDir: string): string;
    export function findConfigAsync(configDir: string): Promise<string>;
    export function readConfigAsync(configDir: string): Promise<string>;
    export function parseFileAsync(configPath: string): Promise<string>;
    export function parseFileSync(configPath: string): any;
    export function readConfigSync(configDir: string): any;
    export function unarchive(archive: string, tempDir: string, toDir: string, toPath?: string): Promise<any>;
    export function src(glob: string[], opt: Object): NodeJS.ReadWriteStream;
    export function moveArchive(tempDir: string, toDir: string, toPath: string): void;
}