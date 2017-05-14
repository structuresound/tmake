import * as _ from 'lodash';
import { check } from 'typed-json-transform';
import * as colors from 'chalk';
import { args } from './runtime';
import { log } from './log';

const { quiet, verbose, add, warn } = log;

export const info = {
  fetch: {
    nuke: function (project) {
      log.error(`remove existing source @ ${project.d.clone}`);
    },
    local: function (project) {
      verbose(`skip fetch, project is local ${project.name}`);
    },
    dirty: function (project: TMake.Project) {
      if (project.cache.fetch.dirty()) {
        verbose(`cache invalid ${project.cache.fetch.get()}`);
        verbose(project.toCache());
      } else {
        verbose('forcing re-fetch of source');
      }
    },
    url: function (project) {
      verbose(`fetching source @ ${project.url()}`);
    },
    link: function (project) {
      add('link source from', project.url());
      warn('to', project.d.root);
    }
  },
  graph: {
    names: function (graph: TMake.Project[]) {
      quiet(_.map(graph, (project) => project.name));
    }
  },
  report: function (report: any) {
    log.log(`
command: ${colors.magenta(report.command)}
date: ${colors.yellow(report.createdAt)}
${report.output}`);
  },
  exit: function () {
    if (!args.verbose) {
      quiet(`run with -v (--verbose) for more info`);
    }
  }
}