import * as _ from 'lodash';
import { check } from 'js-object-tools';

import { args } from './args';
import { log } from './log';
import { Project } from './project';

const {quiet, verbose, add, warn} = log;

export const info = {
  fetch: {
    nuke: function (project) {
      log.error(`remove existing source @ ${project.d.clone}`);
    },
    local: function (project) {
      verbose(`skip fetch, project is local ${project.name}`);
    },
    dirty: function (project) {
      if (project.cache.fetch.dirty()) {
        verbose(`cache invalid ${project.cache.fetch.get()}`);
        verbose(project.cache);
      } else {
        verbose('forcing re-fetch of source');
      }
    },
    url: function (project) {
      verbose(`fetching source @ ${project.url()}`);
    },
    link: function (project) {
      log.add('link source from', project.url());
      log.warn('to', project.d.root);
    }
  },
  graph: {
    names: function (graph: Project[]) {
      verbose(_.map(graph, (project) => project.name));
    }
  },
  exit: function () {
    if (!args.verbose) {
      quiet(`run with -v (--verbose) for more info`);
    }
  }
}