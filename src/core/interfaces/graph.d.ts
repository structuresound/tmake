declare module 'tmake-core/graph' {
  function graph(conf: TMake.Project): PromiseLike<TMake.Project[]>
  function loadCache(project: TMake.Project): PromiseLike<TMake.Project>;
}