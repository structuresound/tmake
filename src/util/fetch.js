import Promise from 'bluebird';
import path from 'path';
import request from 'request';
import progress from 'request-progress';
import ProgressBar from 'progress';

import {startsWith} from '../util/string';
import fs from './fs';
import sh from './sh';
import log from './log';
import {stringHash} from './hash';
import argv from './argv';

import profile from '../profile';
import {cache as db} from '../db';

function download(url, cacheDir = path.join(argv.userCache, 'cache')) {
  if (!fs.existsSync(cacheFile)) {
    sh.mkdir('-p', cacheDir);
  }
  let cacheFile = path.join(cacheDir, stringHash(url));
  if (fs.existsSync(cacheFile)) {
    return Promise.resolve(cacheFile);
  }
  return new Promise((resolve, reject) => {
    let progressBar;
    return progress(request(url), {
      throttle: 100,
      delay: 100,
      lengthHeader: 'x-transfer-length'
    }).on('progress', (state) => {
      if (!progressBar && state.size.total) {
        progressBar = new ProgressBar(`downloading [:bar] :percent :etas ${url}`, {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: state.size.total
        });
      } else if (!progressBar) {
        progressBar = new ProgressBar(`downloading ${url} :elapsed`, {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: 100000000
        });
      }
      if (progressBar) {
        return progressBar.tick(state.size.transferred);
      }
      // The state is an object that looks like this:
      // {
      //     percentage: 0.5,           // Overall percentage (between 0 to 1)
      //     speed: 554732,             // The download speed in bytes/sec
      //     size: {
      //         total: 90044871,       // The total payload size in bytes
      //         transferred: 27610959  // The transferred payload size in bytes
      //     },
      //     time: {
      //         elapsed: 36.235,      // The total elapsed seconds since the start (3 decimals)
      //         remaining: 81.403     // The remaining seconds to finish (3 decimals)
      //     }
      // }
    })
      .on('error', reject)
      .pipe(fs.createWriteStream(cacheFile))
      .on('finish', () => {
        return resolve(cacheFile);
      });
  });
}

function findGit() {
  if (!sh.which('git')) {
    sh.echo('Sorry, this script requires git');
    return sh.exit(1);
  }
}

function parsePath(s) {
  if (startsWith(s, '/')) {
    return s;
  }
  return path.join(argv.runDir, s);
}

function unarchiveSource(filePath, toDir) {
  const tempDir = path.join(argv.userCache, 'temp', stringHash(filePath));
  return fs.unarchive(filePath, tempDir, toDir);
}

function resolveUrl(node) {
  let config = node.git || node.fetch || {};
  if (node.git) {
    if (typeof config === 'string') {
      config = {
        repository: node.git
      };
    }
    if (!config.repository) {
      throw new Error('dependency has git configuration, but no repository was specified');
    }
    const base = `https://github.com/${config.repository}`;
    const archive = config.archive || config.tag || config.branch || node.tag || 'master';
    return `${base}/archive/${archive}.tar.gz`;
  } else if (node.link) {
    return parsePath(node.link);
  } else if (node.fetch) {
    if (typeof config === 'string') {
      config = {
        archive: node.fetch
      };
    }
    if (!config.archive) {
      throw new Error('dependency has fetch configuration, but no archive was specified');
    }
    return config.archive;
  }
  return 'rootConfig';
}
// throw new Error 'unable to resolve url for dependency #{node.name}: #{JSON.stringify(node,0,2)}'

function getSource(node) {
  return fs
    .existsAsync(node.d.clone)
    .then((exists) => {
      const url = resolveUrl(node);
      const hash = stringHash(url);
      if (exists && node.cache.url === hash && !profile.force(node)) {
        if (argv.verbose) {
          log.warn('using cache');
        }
        return Promise.resolve();
      }
      sh.mkdir('-p', node.d.root);
      return download(url).then((file) => {
        return unarchiveSource(file, node.d.clone);
      }).then(() => {
        log.add(`insert new record ${node.name}`);
        return db.update({
          name: node.name
        }, {
          $set: {
            'cache.url': hash
          }
        }, {upsert: true});
      });
    });
}

function linkSource(node) {
  const url = resolveUrl(node);
  log.add('link source from', url);
  log.warn('to', node.d.root);
  return fs
    .existsAsync(node.d.clone)
    .then((exists) => {
      if (exists) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        fs.symlink(url, node.d.root, 'dir', (err) => {
          if (err) {
            reject(err);
          }
          return db.update({
            name: node.name
          }, {
            $set: {
              'cache.url': stringHash(url)
            }
          }, {upsert: true}).then((res) => {
            log.verbose(`inserted new record ${node.name}`);
            return resolve(res);
          });
        });
      });
    });
}

function validate(node) {
  if (fs.existsSync(node.d.clone) && !profile.force(node)) {
    return Promise.resolve();
  }
  return getSource(node);
}

export {
  validate,
  findGit,
  download,
  resolveUrl,
  getSource,
  linkSource
};
