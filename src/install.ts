import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as path from 'path';
import { contains } from 'js-object-tools';
import * as fs from 'fs';

import * as file from './file';
import { log } from './util/log';
import args from './util/args';

import { mv, mkdir } from './util/sh';
import { stringHash, fileHash } from './util/hash';
import { updateNode, updateEnvironment } from './db';

import { startsWith } from './util/string';

import { Environment } from './environment';

function copy(patterns: string[], from: string, to: string, opt: schema.CopyOptions) {
  const filePaths: string[] = [];
  const stream = file.src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(file.map((data: schema.VinylFile, callback: Function) => {
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

function symlink(patterns: string[], from: string, toPath: string, opt: schema.CopyOptions) {
  const filePaths: string[] = [];
  return file.wait(file.src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(file.map((data: schema.VinylFile, callback: Function) => {
    const mut = data;
    if (opt.flatten) {
      mut.base = path.dirname(mut.path);
    }
    const newPath = path.join(toPath, path.relative(mut.base, mut.path));
    filePaths.push(path.relative(opt.relative, newPath));
    callback(null, mut);
  })).pipe(file.symlink(toPath, { relative: true }))).then(() => {
    return Promise.resolve(filePaths);
  });
}

function bin(project: Project) {
  if (contains(['executable'], project.outputType)) {
    mkdir('-p', path.join(args.runDir, 'bin'));
    const binaries: string[] = [];
    _.each(project.d.install.binaries, (ft: schema.InstallOptions) => {
      const from = path.join(ft.from, project.name);
      const to = path.join(ft.to, project.name);
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
    })
      .then(() => {
        return updateNode(
          project, {
            $set: {
              'cache.bin': cumulativeHash,
            }
          });
      });
  }
  return Promise.resolve('executable');
}

function assets(env: Environment) {
  if (env.d.install.assets) {
    return Promise.map(env.d.install.assets, (ft: schema.InstallOptions) => {
      const patterns = ft.sources || ['**/*.*'];
      log.verbose(`[ install assets ] from ${ft.from} to ${ft.to}`);
      return copy(patterns, ft.from, ft.to, {
        flatten: false,
        relative: env.d.home,
        followSymlinks: true
      });
    }).then(assetPaths => {
      return updateEnvironment(env, {
        $set: {
          'cache.assets': _.flatten(assetPaths)
        }
      });
    });
  }
  return Promise.resolve('assets');
}

function libs(env: Environment) {
  if (contains([
    'static', 'dynamic'
  ], env.outputType)) {
    return Promise.map(env.d.install.libraries, (ft: schema.InstallOptions) => {
      let patterns = ft.sources || ['*.a'];
      if (env.project.outputType === 'dynamic') {
        patterns = ft.sources || ['*.dylib', '*.so', '*.dll'];
      }
      log.verbose(`[ install libs ] from ${ft.from} to ${ft.to}`);
      return symlink(patterns, ft.from, ft.to, {
        flatten: true,
        followSymlinks: false,
        relative: env.d.home
      });
    }).then((libPaths) => {
      let cumulativeHash = '';
      return Promise.each(_.flatten(libPaths), (libPath) => {
        fileHash(path.join(env.d.home, libPath));
      }).then((hash) => {
        cumulativeHash = stringHash(cumulativeHash + hash);
        return updateNode(env.project, {
          $set: {
            'cache.libs': _.flatten(libPaths)
          }
        });
      });
    });
  }
  return Promise.resolve('libs');
}

function headers(project: Project) {
  if (contains([
    'static', 'dynamic'
  ], project.outputType)) {
    return Promise.each(project.d.install.headers, (ft: schema.InstallOptions) => {
      const patterns = ft.sources || ['**/*.h', '**/*.hpp', '**/*.ipp'];
      if (args.verbose) {
        log.add('[ install headers ]', patterns, '\nfrom', ft.from, '\nto', ft.to);
      }
      return symlink(patterns, ft.from, ft.to, {
        flatten: false,
        followSymlinks: true,
        relative: project.d.home
      });
    }).then(() => {
      return Promise.resolve();
    })
  }
  return Promise.resolve();
}

function installNode(project: Project) {
  return headers(project).then(() => {
    return bin(project);
  }).then(() => {
    if (args.verbose) {
      log.add('installed');
    }
  });
}

function installEnvironment(env: Environment) {
  return libs(env).then(() => {
    if (args.verbose) {
      log.add('libs');
    }
  }).then(() => {
    return assets(env);
  });
}

export {
  installNode,
  installEnvironment,
  headers as installHeaders
};
