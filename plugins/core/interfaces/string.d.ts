declare module 'tmake-core/string' {
  function startsWith(string: string, s: string): boolean;
  function beginsWith(string: string, s: string): boolean;
  function endsWith(string: string, s: string): boolean;
  function replaceAll(str: string, find: string, rep: string): string;
}