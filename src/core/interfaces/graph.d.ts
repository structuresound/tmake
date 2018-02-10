declare module 'tmake-core/graph' {
  function graph(conf: TMake.Product): PromiseLike<TMake.Product[]>
  function loadCache(project: TMake.Product): PromiseLike<TMake.Product>;
}
