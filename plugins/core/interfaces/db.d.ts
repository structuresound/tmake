/// <reference path="configuration.d.ts" />

declare namespace TMake.Database {
  interface Interface {
    insertProject(project: TMake.Project.Cache.File): PromiseLike<string>;
    updateProject(node: TMake.Project, modifier: { $set?: any, $unset?: any }): PromiseLike<any>
    projectNamed(name: string): PromiseLike<TMake.Project.Cache.File>
    findProjects(query: any): PromiseLike<TMake.Project.Cache.File[]>
    removeProject(name: string, version?: string)

    loadConfiguration(hash: string): PromiseLike<TMake.Project.Cache.File>
    cacheConfiguration(configuration: TMake.Configuration.Cache.File): PromiseLike<any>
    cleanConfigurations(projectName: string): PromiseLike<any>
    cleanConfiguration(hash: string): PromiseLike<any>

    insertReport(report: TMake.Report): PromiseLike<string>

    getReports(): PromiseLike<TMake.Report[]>;
    reset()
  }
}