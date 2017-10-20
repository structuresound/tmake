declare namespace TMake {
  namespace Git {
    interface Config {
      repository: string;
      organization: string;
      branch?: string;
      tag?: string;
      archive?: string;
      url?: string;
    }
  }

  class Git implements Git.Config {
    repository: string;
    organization: string;
    branch?: string;
    tag?: string;
    archive?: string;
    url?: string;
    constructor(config: Git.Config | string)
    version()
    name()
    clone()
    fetch()
  }
}
