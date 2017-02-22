import { check } from 'js-object-tools';
import * as colors from 'chalk';

import { log } from './log';
import { info } from './info';
import { Project } from './project';

export function terminate(msg?: Error | string, error?: Error) {
  if (check(msg, Error)) {
    throw (msg);
  } else if (check(msg, String)) {
    log.throw(msg, error);
  } else {
    log.throw('terminating due to unknown error: ', msg);
  }
  process.exit((msg as any).status || (msg as any).code || 1);
}

export function stop() {
  info.exit();
  process.exit();
}

export const errors = {
  build: {
    command: {
      failed: function (command: string, error: Error) {
        terminate(`command ${command} failed`, error);
      }
    }
  },
  project: {
    notFound: function (name: string, graph?: Project[]) {
      log.log(`${colors.magenta(name)} does not appear in the module graph, check the name?`);
      if (graph) {
        info.graph.names(graph)
      }
      stop();
    }
  }
}