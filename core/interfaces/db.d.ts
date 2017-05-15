/// <reference path="environment.d.ts" />

declare namespace TMake {
  class Db {
    insertProject(project: TMake.Project.Cache.File): PromiseLike<string>;
    updateProject(node: TMake.Project, modifier: { $set?: any, $unset?: any }): PromiseLike<any>
    projectNamed(name: string): PromiseLike<TMake.Project.File>
    findProjects(query: any): PromiseLike<TMake.Project.File[]>
    removeProject(name: string, version: string)

    loadEnvironment(hash: string): PromiseLike<TMake.Project.Cache.File>
    cacheEnvironment(env: TMake.Environment.Cache.File): PromiseLike<boolean>
    clearEnvironment(name: string);

    insertReport(report: TMake.Report): PromiseLike<string>

    reset()
  }
}