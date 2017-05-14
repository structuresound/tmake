declare module 'tmake-core/graph' {
  function graph(conf: TMake.Project | TMake.Project.File): PromiseLike<TMake.Project[]>
  function loadCache(project: TMake.Project): PromiseLike<TMake.Project>;
}