/// <reference path="configuration.d.ts" />

declare namespace TMake.Database {
  interface Interface {
    insertProject(project: TMake.Product.Cache.File)
    projectNamed(name: string): PromiseLike<TMake.Product.Cache.File>
    findProjects(query: any)
    updateProject(project: TMake.Product, modifier: any)
    removeProject(name: string, version?: string)
    loadConfiguration(hash: string)
    cacheConfiguration(doc: TMake.Configuration.Cache.File)
    cleanConfigurations(projectName: string): PromiseLike<number>
    cleanConfiguration(hash: string): PromiseLike<number>

    registerPackage(project: TMake.Trie.Project);
    getPackage(entry: TMake.Trie.Project.Package): PromiseLike<TMake.Trie.Project>;

    insertReport(report: TMake.Report)
    getReports(): PromiseLike<TMake.Report[]>
    reset()
  }
}

