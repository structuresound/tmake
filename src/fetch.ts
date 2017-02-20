import * as Bluebird from 'bluebird';
import * as path from 'path';
import * as request from 'request';
import progress = require('request-progress');
import * as ProgressBar from 'progress';
import * as fs from 'fs';
import * as file from './file';

import { log } from './log';
import { args } from './args';
import { mkdir, which, exit } from './sh';
import { cache, updateNode } from './db';
import { stringHash } from './hash';
import { Project } from './project';

export interface Git {
  repository?: string;
  url?: string;
  branch?: string;
  tag?: string;
  archive?: string;
}

function download(url: string, cacheDir = path.join(args.userCache,
  'cache')) {
  if (!fs.existsSync(cacheDir)) {
    mkdir('-p', cacheDir);
  }
  let cacheFile = path.join(cacheDir, stringHash(url));
  if (fs.existsSync(cacheFile)) {
    return Promise.resolve(cacheFile);
  }
  return new Promise<string>((resolve, reject) => {
    let progressBar: ProgressBar;
    const options = {
      throttle: 100,
      delay: 100,
      lengthHeader: 'x-transfer-length'
    };
    const progressFn = (state: any) => {
      if (!progressBar && state.size.total) {
        progressBar =
          new ProgressBar(`downloading [:bar] :percent :etas ${url}`, {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: state.size.total
          });
      } else if (!progressBar) {
        progressBar =
          new ProgressBar(
            `downloading ${url} :elapsed`,
            { complete: '=', incomplete: ' ', width: 20, total: 100000000 });
      } if (progressBar) { return progressBar.tick(state.size.transferred); }
      // The state is an object that looks like this:
      // {
      //     percentage: 0.5,           // Overall
      //     percentage (between 0 to 1)
      //     speed: 554732,             // The download
      //     speed in bytes/sec
      //     size: {
      //         total: 90044871,       // The total payload
      //         size in bytes
      //         transferred: 27610959  // The transferred
      //         payload size in bytes
      //     },
      //     time: {
      //         elapsed: 36.235,      // The total elapsed
      //         seconds since the start (3 decimals)
      //         remaining: 81.403     // The remaining
      //         seconds to finish (3 decimals)
      //     }
      // }
    };
    return progress(request(url), options)
      .on('progress', progressFn)
      .on('error', reject)
      .pipe(fs.createWriteStream(cacheFile))
      .on('finish', () => { return resolve(cacheFile); });
  });
}

function findGit() {
  if (!which('git')) {
    log.error('Sorry, this script requires git');
    return exit(1);
  }
}

function unarchiveSource(filePath: string, toDir: string) {
  const tempDir = path.join(args.userCache, 'temp', stringHash(filePath));
  return file.unarchive(filePath, tempDir, toDir);
}

function updateCache(node: Project) {
  const modifier = {
    $set: {
      'cache.fetch': node.cache.fetch.update()
    }
  };
  return updateNode(node, modifier);
}

function upsertCache(node: Project) {
  return cache.findOne({ name: node.name }).then((res: any) => {
    if (res) {
      return updateCache(node);
    }
    return cache.insert(node.toCache())
      .then(() => { return updateCache(node); });
  }).then(() => Promise.resolve());
}

function getSource(node: Project) {
  const url = node.url();
  mkdir('-p', node.d.root);
  log.verbose(`fetching source @ ${url}`);
  return download(url)
    .then((filePath) => { return unarchiveSource(filePath, node.d.clone); });
}

function linkSource(node: Project) {
  const url = node.url();
  log.add('link source from', url);
  log.warn('to', node.d.root);
  return file.existsAsync(node.d.clone)
    .then((exists) => {
      if (exists) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        fs.symlink(url, node.d.root, 'dir', (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      });
    });
}

function destroy(node: Project) {
  return file.existsAsync(node.d.clone)
    .then((exists) => {
      if (exists) {
        // log.error(node.cache.debug.url);
        log.add(node.url());
        log.error('source url changed ... remove existing source');
        file.nuke(node.d.clone);
      }
      node.cache.fetch.reset();
      const modifier = {
        $unset: {
          'cache.fetch': ''
        }
      };
      return updateNode(node, modifier);
    });
}

function reportStale(node: Project) {
  if (node.cache.fetch.dirty()) {
    log.error(`cache invalid ${node.cache.fetch.get()}`);
    log.verbose(node.cache);
  } else {
    log.add('forcing re-fetch of source');
  }
}

function maybeFetch(node: Project) {
  if (node.link) {
    return linkSource(node).then(() => Promise.resolve(true));
  }
  if (node.archive || node.git) {
    return file.existsAsync(node.d.clone).then((exists) => {
      const getIt = () => {
        if (!exists || node.cache.fetch.dirty() || node.force()) {
          if (exists) {
            return destroy(node).then(() => getSource(node));
          }
          return getSource(node)
        }
      }
      const ret = getIt()
      return ret ? ret.then(() => Promise.resolve(true)) : Promise.resolve(false);
    });
  }
  log.info(`skip fetch, project is local ${node.name}`);
  return Promise.resolve(false);
}

function fetch(node: Project) {
  return maybeFetch(node).then(() => { return upsertCache(node) });
}

export { fetch, findGit, download, getSource, linkSource, destroy };
