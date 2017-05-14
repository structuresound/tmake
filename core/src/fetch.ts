import * as Bluebird from 'bluebird';
import * as path from 'path';
import * as request from 'request';
import progress = require('request-progress');
import * as ProgressBar from 'progress';
import * as fs from 'fs';
import * as file from 'tmake-file';
import { mkdir, which } from 'shelljs';

import { log } from './log';
import { info } from './info';
import { args } from './runtime';

import { Db } from './db';
import { stringHash } from './hash';

export namespace Fetch {
  export function download(url: string) {
    const cacheDir = path.join(args.userCache, 'cache')
    mkdir('-p', cacheDir);
    let cacheFile = path.join(cacheDir, stringHash(url));
    if (fs.existsSync(cacheFile)) {
      return Bluebird.resolve(cacheFile);
    }
    return new Bluebird<string>((resolve, reject) => {
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

  function unarchiveSource(filePath: string, toDir: string) {
    const tempDir = path.join(args.userCache, 'temp', stringHash(filePath));
    return file.unarchive(filePath, tempDir, toDir);
  }

  function updateCache(project: TMake.Project) {
    const modifier = {
      $set: {
        'cache.fetch': project.cache.fetch.update()
      }
    };
    return Db.updateProject(project, modifier);
  }

  function upsertCache(project: TMake.Project) {
    return Db.cache.findOne({ name: project.name }).then((res: any) => {
      if (res) {
        return updateCache(project);
      }
      return Db.cache.insert(project.toCache())
        .then(() => { return updateCache(project); });
    }).then(() => Bluebird.resolve());
  }

  function getSource(project: TMake.Project) {
    const url = project.url();
    if (url === 'none') {
      return Bluebird.resolve('');
    }
    mkdir('-p', project.d.root);
    info.fetch.url(project);
    return download(url)
      .then((filePath) => { return unarchiveSource(filePath, project.d.clone); });
  }

  function linkSource(project: TMake.Project) {
    const url = project.url();
    info.fetch.link(project);
    return new Bluebird<void>((resolve, reject) => {
      try {
        fs.symlink(url, project.d.root, 'dir', (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      } catch (e) {
        resolve();
      }
    });
  }

  function destroy(project: TMake.Project) {
    try {
      info.fetch.nuke(project);
      file.nuke(project.d.clone);
    } catch (e) { }
    project.cache.fetch.reset();
    const modifier = {
      $unset: {
        'cache.fetch': ''
      }
    };
    return Db.updateProject(project, modifier);
  }

  function getIt(project: TMake.Project, exists: boolean) {
    if (!exists || project.cache.fetch.dirty() || project.force()) {
      info.fetch.dirty(project);
      if (exists) {
        return destroy(project).then(() => getSource(project));
      }
      return getSource(project)
    }
  }

  function maybeFetch(project: TMake.Project) {
    if (project.link) {
      return linkSource(project).then(() => Bluebird.resolve(true));
    }
    if (project.archive || project.git) {
      const exists = fs.existsSync(project.d.clone);
      const ret = getIt(project, exists)
      return ret ? ret.then(() => Bluebird.resolve(true)) : Bluebird.resolve(false);
    }
    info.fetch.local(project);
    return Bluebird.resolve(false);
  }

  export function project(project: TMake.Project, isTest?: boolean) {
    return maybeFetch(project).then(() => { return upsertCache(project) });
  }
}