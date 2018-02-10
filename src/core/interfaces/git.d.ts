/// <reference path="trie.d.ts" />

declare namespace TMake {
  class Git implements Trie.Git {
    repository: string;
    organization: string;
    branch?: string;
    tag?: string;
    archive?: string;
    url?: string;
    constructor(config: Trie.Git | string)
    version()
    name()
    clone()
    fetch()
  }
}
