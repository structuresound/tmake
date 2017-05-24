/// <reference path="project.d.ts" />

declare module 'tmake-core/error' {
  class TMakeError extends Error {
    reason: Error
    constructor(message: string, reason?: Error);
    postMortem();
  }
}


declare namespace TMake {
  interface Report {
    command: string;
    output: string;
    createdAt: Date
  }

  namespace Error {
    interface Helper {
      graph: {
        failed(nodes: string, error: Error)
      },
      configure: {
        noProjectFile(plugin: TMake.Plugin.Compiler)
      },
      build: {
        command: {
          failed(command: string, error: Error)
        },
        noBuildFile(plugin: TMake.Plugin.Compiler)
      },
      project: {
        notFound(name: string, graph?: TMake.Project[])
      },
      noRoot(project: TMake.Project),
      shell: {
        failed(command: string, error: Error)
      },
      report({ command, output, cwd, short })
    }
  }

  const errors: TMake.Error.Helper;
}
