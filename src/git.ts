import { check, extend } from 'js-object-tools';

import { log } from './log';
import { mkdir, which, exit } from './sh';

export interface GitConfig {
  repository?: string;
  organization?: string;
  branch?: string;
  tag?: string;
  archive?: string;
  url?: string;
}

export function findGit() {
  if (!which('git')) {
    log.error('Sorry, this script requires git');
    return exit(1);
  }
}

export function resolve(git: Git) {
  if (typeof git === 'string') {
    return <Git>{ repository: git as string };
  }
  return git;
}

export class Git implements GitConfig {
  repository: string;
  organization: string;
  branch: string;
  tag: string;
  archive?: string;
  url?: string;
  constructor(config: GitConfig | string) {
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
      return this.repository.slice(this.repository.indexOf('/') + 1);
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
    if (!this.repository) {
      throw new Error(
        'dependency has git configuration, but no repository was specified');
    }
    const base = this.clone();
    const archive = this.archive || this.tag || this.branch || 'master';
    return `${base}/archive/${archive}.tar.gz`;
  }
}