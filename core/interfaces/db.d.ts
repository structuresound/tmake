/// <reference path="environment.d.ts" />

declare namespace TMake.Database {
  interface Interface {
  insertProject(project: TMake.Project.Cache.File): PromiseLike<string>;
  updateProject(node: TMake.Project, modifier: { $set?: any, $unset?: any }): PromiseLike<any>
  projectNamed(name: string): PromiseLike<TMake.Project.File>
  findProjects(query: any): PromiseLike<TMake.Project.File[]>
  removeProject(name: string, version?: string)

  loadEnvironment(hash: string): PromiseLike<TMake.Project.Cache.File>
  cacheEnvironment(env: TMake.Environment.Cache.File): PromiseLike<any>
  cleanEnvironments(projectName: string): PromiseLike<any>
  cleanEnvironment(hash: string): PromiseLike<any>

  insertReport(report: TMake.Report): PromiseLike<string>

  getReports(): PromiseLike<TMake.Report[]>;
  reset()
  }
}