import Promise from "bluebird";
import colors from 'chalk';
import path from 'path';
import './string';
import fs from './fs';
import sh from './sh';
import log from '../util/log';

import {stringHash} from './hash';

import request from 'request';
import progress from 'request-progress';
import ProgressBar from 'progress';

const download = function(url, cacheDir) {
  if (!fs.existsSync(cacheFile)) {
    sh.mkdir('-p', cacheDir);
  }
  var cacheFile = path.join(cacheDir, stringHash(url));
  if (fs.existsSync(cacheFile)) {
    return Promise.resolve(cacheFile);
  } else {
    return new Promise(function(resolve, reject) {
      const progressBar = undefined;
      return progress(request(url), {
        throttle: 100,
        delay: 100,
        lengthHeader: 'x-transfer-length'
      }).on('progress', function(state) {
        if (!progressBar && state.size.total) {
          progressBar = new ProgressBar(`downloading [:bar] :percent :etas ${url}`, {
            compconste: '=',
            incompconste: ' ',
            width: 20,
            total: state.size.total
          });
        } else if (!progressBar) {
          progressBar = new ProgressBar(`downloading ${url} :elapsed`, {
            compconste: '=',
            incompconste: ' ',
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
      }).on('error', reject).pipe(fs.createWriteStream(cacheFile)).on('finish', () => resolve(cacheFile));
    });
  }
};

const findGit = function() {
  if (!sh.which('git')) {
    sh.echo('Sorry, this script requires git');
    return sh.exit(1);
  }
};

const parsePath = function(s) {
  if (s.startsWith('/')) {
    return s;
  } else {
    return path.join(argv.runDir, s);
  }
};

const _fetch = url => download(url, path.join(argv.userCache, 'cache'));

const unarchiveSource = function(filePath, toDir) {
  const tempDir = path.join(argv.userCache, 'temp', stringHash(filePath));
  return fs.unarchive(filePath, tempDir, toDir);
};

const resolveUrl = function() {
  const config = dep.git || dep.fetch || {};
  if (dep.git) {
    if (typeof config === 'string') {
      config = {
        repository: dep.git
      };
    }
    if (!config.repository) {
      throw new Error("dependency has git configuration, but no repository was specified");
    }
    const base = `https://github.com/${config.repository}`;
    const archive = config.archive || config.tag || config.branch || dep.tag || "master";
    return `${base}/archive/${archive}.tar.gz`;
  } else if (dep.link) {
    return parsePath(dep.link);
  } else if (dep.fetch) {
    if (typeof config === 'string') {
      config = {
        archive: dep.fetch
      };
    }
    if (!config.archive) {
      throw new Error("dependency has fetch configuration, but no archive was specified");
    }
    return config.archive;
  } else {
    return "rootConfig";
  }
};
// throw new Error "unable to resolve url for dependency #{dep.name}: #{JSON.stringify(dep,0,2)}"

const getSource = () => fs.existsAsync(dep.d.clone).then(function(exists) {
  const url = resolveUrl();
  const hash = stringHash(url);
  if (exists && dep.cache.url === hash && !platform.force(dep)) {
    if (argv.verbose) {
      console.log(colors.yellow('using cache'));
    }
    return Promise.resolve();
  } else {
    sh.mkdir('-p', dep.d.root);
    return _fetch(url).then(file => unarchiveSource(file, dep.d.clone)).then(() => db.update({
      name: dep.name
    }, {
      $set: {
        "cache.url": hash
      }
    }, {upsert: true}).then(function() {
      if (argv.verbose) {
        return console.log(colors.magenta(`inserted new record ${dep.name}`));
      }
    }));
  }
});

const linkSource = function() {
  const url = resolveUrl();
  if (!argv.quiet) {
    console.log(colors.green('link source from', url));
  }
  if (!argv.quiet) {
    console.log(colors.yellow('to', dep.d.root));
  }
  return fs.existsAsync(dep.d.clone).then(function(exists) {
    if (exists) {
      return Promise.resolve();
    } else {
      return new Promise((resolve, reject) => fs.symlink(url, dep.d.root, 'dir', function(err) {
        if (err) {
          reject(err);
        }
        return db.update({
          name: dep.name
        }, {
          $set: {
            "cache.url": stringHash(url)
          }
        }, {upsert: true}).then(function(res) {
          if (argv.verbose) {
            console.log(colors.magenta(`inserted new record ${dep.name}`));
          }
          return resolve(res);
        });
      }));
    }
  });
};

// clone = ->
//   return checkout() if (dep.cache.git && fs.existsSync(dep.d.clone) && !platform.force(dep))
//   fs.nuke dep.d.clone
//   unless argv.quiet then console.log colors.green "cloning #{config.url} into #{dep.d.clone}"
//   new Promise (resolve, reject) ->
//     git.clone config.url, dep.d.clone, (err) ->
//       return reject err if err
//       dep.cache.git = checkout: "master"
//       db.update
//           name: dep.name
//         ,
//           $set:
//             "cache.git.checkout": "master"
//             "tag": config.checkout
//         ,
//           upsert: true
//       .then ->
//         checkout()
//       .then ->
//         resolve()
//       .catch (e) ->
//         reject e

// checkout = ->
//   if ((dep.cache.git?.checkout == config.checkout) && !platform.force(dep))
//     unless argv.quiet then console.log 'using ', dep.name, '@', config.checkout
//     return Promise.resolve()
//   sh.Promise "git checkout #{config.checkout}", dep.d.clone, argv.verbose
//   .then ->
//     db.update
//         name: dep.name
//       ,
//         $set: "cache.git.checkout": config.checkout
//       ,
//         {}

export default {
  validate() {
    if (fs.existsSync(dep.d.clone) && !platform.force(dep)) {
      return Promise.resolve();
    } else {
      return getSource();
    }
  },

  findGit,
  fetch : _fetch,
  resolveUrl,
  getSource,
  linkSource
};
