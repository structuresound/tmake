/// <reference path="configuration.d.ts" />

declare namespace TMake.Database {
  interface Interface {
    insertProject(project: TMake.Project.Cache.File)
    projectNamed(name: string): PromiseLike<TMake.Project.Cache.File>
    findProjects(query: any)
    updateProject(project: TMake.Project, modifier: any)
    removeProject(name: string, version?: string)
    loadConfiguration(hash: string)
    cacheConfiguration(doc: TMake.Configuration.Cache.File)
    cleanConfigurations(projectName: string): PromiseLike<number>
    cleanConfiguration(hash: string): PromiseLike<number>

    insertReport(report: TMake.Report)
    getReports(): PromiseLike<TMake.Report[]>
    reset()
  }
}

