declare module 'tmake-core/hash' {
  export function jsonStableHash(obj: any): string;
  export function stringHash(string: string): string;
  export function fileHashSync(filePath: string): string;
  export function fileHash(filePath: string): string;
}