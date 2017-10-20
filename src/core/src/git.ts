import { check, extend } from 'typed-json-transform';

import { ensureCommand } from './shell';
import { log } from './log';

export function resolve(git: Git) {
  if (typeof git === 'string') {
    return <Git>{ repository: git as string };
  }
  return git;
}

export class Git implements TMake.Git.Config {
  repository: string;
  organization: string;
  branch?: string;
  tag?: string;
  archive?: string;
  url?: string;
  constructor(config: TMake.Git.Config | string) {
    if (check(config, String)) {
      const str: string = config as string;
      this.repository = str;
    } else {
      extend(this, config as Git);
    }
    if (!this.repository) {
      log.throw('constructing git without repository string', this);
    }
    if (this.repository.indexOf(':') !== -1) {
      const str = this.repository;
      this.tag = str.slice(str.lastIndexOf(':') + 1);
      this.repository = str.slice(0, str.lastIndexOf(':'));
    }
    if (this.repository.indexOf('/') !== -1) {
      const str = this.repository;
      this.repository = str.slice(str.lastIndexOf('/') + 1);
      this.organization = str.slice(0, str.lastIndexOf('/'));
    }
  }
  version() {
    if (check(this.tag, String)) {
      return this.tag;
    } else if (check(this.branch, String)) {
      return this.branch;
    } else if (check(this.archive, String)) {
      return this.archive;
    }
    return 'master';
  }
  name() {
    if (this.repository) {
      return this.repository;
    }
    if (this.url) {
      const lastPathComponent =
        this.url.slice(this.url.lastIndexOf('/') + 1);
      return lastPathComponent.slice(0, lastPathComponent.lastIndexOf('.'));
    }
  }
  clone() {
    return `https://github.com/${this.organization}/${this.repository}`;
  }
  fetch() {
    ensureCommand('git');
    if (!this.repository) {
      throw new Error(
        'dependency has git configuration, but no repository was specified');
    }
    const base = this.clone();
    const archive = this.archive || this.tag || this.branch || 'master';
    return `${base}/archive/${archive}.tar.gz`;
  }
}
