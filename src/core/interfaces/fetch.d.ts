declare module 'tmake-core/fetch' {
  namespace Fetch {
    export function download(url: string): PromiseLike<string>
  }
}