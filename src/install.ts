import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as path from 'path';
import {diff} from 'js-object-tools';
import * as fs from 'fs';

import * as file from './util/file';
import log from './util/log';
import args from './util/args';

import {mv, mkdir} from './util/sh';
import {stringHash, fileHash} from './util/hash';
import {updateNode} from './db';

import {startsWith} from './util/string';

import {Node} from './node';

function copy(patterns: string[], from: string, to: string, opt: file.CopyOptions){
  const filePaths: string[] = [];
  const stream = file.src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(file.map((data: file.VinylFile, callback: Function) => {
    const mut = data;
    if (opt.flatten) {
      mut.base = path.dirname(mut.path);
    }
    const newPath = path.join(to, path.relative(mut.base, mut.path));
    filePaths.push(path.relative(opt.relative, newPath));
    callback(null, mut);
  })).pipe(file.dest(to));
  return file.wait(stream).then(() => {
    return Promise.resolve(filePaths);
  });
};

function symlink(patterns: string[], from: string, toPath: string, opt: file.CopyOptions) {
  const filePaths: string[] = [];
  return file.wait(file.src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(file.map((data: file.VinylFile, callback: Function) => {
    const mut = data;
    if (opt.flatten) {
      mut.base = path.dirname(mut.path);
    }
    const newPath = path.join(toPath, path.relative(mut.base, mut.path));
    filePaths.push(path.relative(opt.relative, newPath));
    callback(null, mut);
  })).pipe(file.symlink(toPath, {relative: true}))).then(() => {
    return Promise.resolve(filePaths);
  });
}

function bin(node: Node) {
  if (diff.contains(['bin'], node.target)) {
    mkdir('-p', path.join(args.runDir, 'bin'));
    const binaries: string[] = [];
    _.each(node.d.install.binaries, (ft: file.InstallOptions) => {
      const from = path.join(ft.from, node.name);
      const to = path.join(ft.to, node.name);
      log.verbose(`[ install bin ] from ${from} to ${to}`);
      mv(from, to);
      return binaries.push(to);
    });
    let cumulativeHash = '';
    return Promise.each(binaries, (binPath) => {
      log.quiet('hash binary', binPath);
      return fileHash(binPath).then((hash) => {
        cumulativeHash = stringHash(cumulativeHash + hash);
        return Promise.resolve(cumulativeHash);
      });
    }).then(() => {
      return updateNode(
       node, {
        $set: {
          'cache.bin': cumulativeHash,
          'cache.target': cumulativeHash
        }
      });
    });
  }
  return Promise.resolve('bin');
}

function assets(node: Node) {
  if (node.d.install.assets) {
    return Promise.map(node.d.install.assets, (ft: file.InstallOptions) => {
      const patterns = ft.matching || ['**/*.*'];
      log.verbose(`[ install assets ] from ${ft.from} to ${ft.to}`);
      return copy(patterns, ft.from, ft.to, {
        flatten: false,
        relative: node.d.home,
        followSymlinks: true
      });
    }).then(assetPaths => {
      return updateNode(node, {
        $set: {
          'cache.assets': _.flatten(assetPaths)
        }
      });
    });
  }
  return Promise.resolve('assets');
}

function libs(node: Node) {
  if (diff.contains([
    'static', 'dynamic'
  ], node.target)) {
    return Promise.map(node.d.install.libraries, (ft) => {
      let patterns = ft.matching || ['*.a'];
      if (node.target === 'dynamic') {
        patterns = ft.matching || ['*.dylib', '*.so', '*.dll'];
      }
      log.verbose(`[ install libs ] from ${ft.from} to ${ft.to}`);
      return symlink(patterns, ft.from, ft.to, {
        flatten: true,
        followSymlinks: false,
        relative: node.d.home
      });
    }).then((libPaths) => {
      let cumulativeHash = '';
      return Promise.each(_.flatten(libPaths), (libPath) => {
        fileHash(path.join(node.d.home, libPath));
      }).then((hash) => {
        cumulativeHash = stringHash(cumulativeHash + hash);
        return updateNode(node, {
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

function headers(node: Node) {
  if (diff.contains([
    'static', 'dynamic'
  ], node.target)) {
    return Promise.each(node.d.install.headers, (ft) => {
      const patterns = ft.matching || ['**/*.h', '**/*.hpp', '**/*.ipp'];
      if (args.verbose) {
        log.add('[ install headers ] matching', patterns, '\nfrom', ft.from, '\nto', ft.to);
      }
      return symlink(patterns, ft.from, ft.to, {
        flatten: false,
        followSymlinks: true,
        relative: node.d.home
      });
    }).then(() => {
      return Promise.resolve();
    })
  }
  return Promise.resolve();
}

function install(node: Node) {
  return headers(node).then(() => {
    return libs(node);
  }).then(() => {
    if (args.verbose) {
      log.add('libs');
    }
    return bin(node);
  }).then(() => {
    return assets(node);
  }).then(() => {
    if (args.verbose) {
      log.add('installed');
    }
    return updateNode(node, {
      $set: {
        'cache.installed': true
      }
    });
  });
}

export {
  install,
  headers as installHeaders
};
