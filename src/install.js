import _ from 'lodash';
import _vinyl from 'vinyl-fs';
import Promise from 'bluebird';
import path from 'path';
import sh from 'shelljs';
import fs from './util/fs';
import log from './util/log';
// { jsonStableHash } = require './util/hash'
import {stringHash, fileHash} from './util/hash';
import argv from './util/argv';
import {cache as db} from './db';
import {startsWith} from './util/string';

const vinyl = {
  symlink: _vinyl.symlink,
  dest: _vinyl.dest,
  src(glob, opt) {
    const patterns = _.map(glob, (string) => {
      if (startsWith(string, '/')) {
        return string.slice(1);
      }
      return string;
    });
    return _vinyl.src(patterns, opt);
  }
};

const copy = (patterns, from, to, opt) => {
  const filePaths = [];
  return fs.wait(vinyl.src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(fs.map((file, emit) => {
    const mut = file;
    if (opt.flatten) {
      mut.base = path.dirname(file.path);
    }
    const newPath = path.join(to, path.relative(file.base, file.path));
    filePaths.push(path.relative(opt.relative, newPath));
    return emit(null, file);
  })).pipe(vinyl.dest(to))).then(() => {
    return Promise.resolve(filePaths);
  });
};

function symlink(patterns, from, to, opt) {
  const filePaths = [];
  return fs.wait(vinyl.src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(fs.map((file, emit) => {
    const mut = file;
    if (opt.flatten) {
      mut.base = path.dirname(file.path);
    }
    const newPath = path.join(to, path.relative(file.base, file.path));
    filePaths.push(path.relative(opt.relative, newPath));
    return emit(null, file);
  })).pipe(vinyl.symlink(to, {relative: true}))).then(() => {
    return Promise.resolve(filePaths);
  });
}

function installBin(dep) {
  if (_.contains(['bin'], dep.target)) {
    sh.mkdir('-p', path.join(argv.runDir, 'bin'));
    const binaries = [];
    _.each(dep.d.install.binaries, (ft) => {
      const from = path.join(ft.from, dep.name);
      const to = path.join(ft.to, dep.name);
      log.verbose(`[ install bin ] from ${from} to ${to}`);
      sh.mv(from, to);
      return binaries.push(to);
    });
    let cumulativeHash = '';
    return Promise.each(binaries, (binPath) => {
      log.quiet('hash binary', binPath);
      return fileHash(path).then((hash) => {
        cumulativeHash = stringHash(cumulativeHash + hash);
        return Promise.resolve(cumulativeHash);
      });
    }).then(() => {
      return db.update({
        name: dep.name
      }, {
        $set: {
          'cache.bin': cumulativeHash,
          'cache.target': cumulativeHash
        }
      });
    });
  }
  return Promise.resolve('bin');
}

function assets(dep) {
  if (dep.d.install.assets) {
    return Promise.map(dep.d.install.assets, (ft) => {
      const patterns = ft.matching || ['**/*.*'];
      log.verbose(`[ install assets ] from ${ft.from} to ${ft.to}`);
      return copy(patterns, ft.from, ft.to, {
        flatten: false,
        relative: dep.d.home,
        followSymlinks: true
      });
    }).then(assetPaths => {
      return db.update({
        name: dep.name
      }, {
        $set: {
          assets: _.flatten(assetPaths)
        }
      }, {});
    });
  }
  return Promise.resolve('assets');
}

function libs(dep) {
  if (_.contains([
    'static', 'dynamic'
  ], dep.target)) {
    return Promise.map(dep.d.install.libraries, (ft) => {
      let patterns = ft.matching || ['*.a'];
      if (dep.target === 'dynamic') {
        patterns = ft.matching || ['*.dylib', '*.so', '*.dll'];
      }
      log.verbose(`[ install libs ] from ${ft.from} to ${ft.to}`);
      return symlink(patterns, ft.from, ft.to, {
        flatten: true,
        followSymlinks: false,
        relative: dep.d.home
      });
    }).then((libPaths) => {
      let cumulativeHash = '';
      return Promise.each(_.flatten(libPaths), (libPath) => {
        fileHash(path.join(dep.d.home, libPath));
      }).then((hash) => {
        cumulativeHash = stringHash(cumulativeHash + hash);
        return db.update({
          name: dep.name
        }, {
          $set: {
            libs: _.flatten(libPaths),
            'cache.libs': cumulativeHash,
            'cache.target': cumulativeHash
          }
        });
      });
    });
  }
  return Promise.resolve('libs');
}

function headers(dep) {
  if (_.contains([
    'static', 'dynamic'
  ], dep.target)) {
    return Promise.map(dep.d.install.headers, (ft) => {
      const patterns = ft.matching || ['**/*.h', '**/*.hpp', '**/*.ipp'];
      if (argv.verbose) {
        log.add('[ install headers ] matching', patterns, '\nfrom', ft.from, '\nto', ft.to);
      }
      return symlink(patterns, ft.from, ft.to, {
        flatten: false,
        followSymlinks: true,
        relative: dep.d.home
      });
    });
  }
  return Promise.resolve('headers');
}

function execute(dep) {
  return headers(dep).then(() => {
    return libs(dep);
  }).then(() => {
    if (argv.verbose) {
      log.add('libs');
    }
    return installBin();
  }).then(() => {
    return assets(dep);
  }).then(() => {
    if (argv.verbose) {
      log.add('installed');
    }
    return db.update({
      name: dep.name
    }, {
      $set: {
        'cache.installed': true
      }
    }, {});
  });
}

export default {
  headers,
  libs,
  assets,
  execute,
  copy
};
