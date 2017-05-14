/// <reference path="plugin.d.ts" />

declare module 'tmake-core/runtime' {
  export namespace Runtime {
    function loadPlugins(): void
    function registerPlugin(plugin: typeof Plugin): void
    function getPlugin(name: string): Plugin
  }
}