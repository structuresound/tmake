import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import { contains } from 'js-object-tools';
import * as fs from 'fs';

import { VinylOptions, VinylFile, src, map, dest, wait, symlink } from './file';
import { log } from './log';
import { args } from './args';
import { mv, mkdir } from './sh';
import { stringHash, fileHash } from './hash';
import { updateNode, updateEnvironment } from './db';
import { startsWith } from './string';

import { Project } from './project';
import { Environment } from './environment';

export interface InstallOptions {
  from: string;
  to?: string;
  sources?: string[];
  includeFrom?: string;
}

export interface Install {
  binaries?: InstallOptions[];
  headers?: InstallOptions[];
  libs?: InstallOptions[];
  assets?: InstallOptions[];
  libraries?: InstallOptions[];
}

interface CopyOptions {
  patterns: string[], from: string, to: string, opt: VinylOptions
}

function copy({patterns, from, to, opt}: CopyOptions) {
  const filePaths: string[] = [];
  const stream = src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(map((data: VinylFile, callback: Function) => {
    const mut = data;
    if (opt.flatten) {
      mut.base = path.dirname(mut.path);
    }
    const newPath = path.join(to, path.relative(mut.base, mut.path));
    filePaths.push(path.relative(opt.relative, newPath));
    callback(null, mut);
  })).pipe(dest(to));
  return wait(stream).then(() => {
    return Promise.resolve(filePaths);
  });
};

function link({patterns, from, to, opt}: CopyOptions) {
  const filePaths: string[] = [];
  return wait(src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(map((data: VinylFile, callback: Function) => {
    const mut = data;
    if (opt.flatten) {
      mut.base = path.dirname(mut.path);
    }
    const newPath = path.join(to, path.relative(mut.base, mut.path));
    filePaths.push(path.relative(opt.relative, newPath));
    callback(null, mut);
  })).pipe(symlink(to))).then(() => {
    return Promise.resolve(filePaths);
  });
}

function bin(project: Project) {
  if (contains(['executable'], project.outputType)) {
    mkdir('-p', path.join(args.runDir, 'bin'));
    const binaries: string[] = [];
    _.each(project.d.install.binaries, (ft: InstallOptions) => {
      const from = path.join(ft.from, project.name);
      const to = path.join(ft.to, project.name);
      log.verbose(`[ install bin ] from ${from} to ${to}`);
      mv(from, to);
      return binaries.push(to);
    });
    let cumulativeHash = '';
    return Bluebird.each(binaries, (binPath) => {
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
    return Bluebird.map(env.d.install.assets, (ft: InstallOptions) => {
      const patterns = ft.sources || ['**/*.*'];
      log.verbose(`[ install assets ] from ${ft.from} to ${ft.to}`);
      return copy({
        patterns, from: ft.from, to: ft.to, opt: {
          flatten: false,
          relative: env.project.d.home,
          followSymlinks: true
        }
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
    return Bluebird.map(env.d.install.libraries, (ft: InstallOptions) => {
      let patterns = ft.sources || ['*.a'];
      if (env.project.outputType === 'dynamic') {
        patterns = ft.sources || ['*.dylib', '*.so', '*.dll'];
      }
      log.verbose(`[ install libs ] from ${ft.from} to ${ft.to}`);
      return link({
        patterns, from: ft.from, to: ft.to, opt: {
          flatten: true,
          followSymlinks: false,
          relative: env.project.d.home
        }
      });
    }).then((libPaths) => {
      let cumulativeHash = '';
      return Bluebird.each(_.flatten(libPaths), (libPath) => {
        fileHash(path.join(env.project.d.home, libPath));
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
  return Bluebird.resolve('libs');
}

export function installHeaders(project: Project) {
  if (contains([
    'static', 'dynamic'
  ], project.outputType)) {
    return Bluebird.each(project.d.install.headers, (ft: InstallOptions) => {
      const patterns = ft.sources || ['**/*.h', '**/*.hpp', '**/*.ipp'];
      if (args.verbose) {
        log.add('[ install headers ]', patterns, '\nfrom', ft.from, '\nto', ft.to);
      }
      return link({
        patterns, from: ft.from, to: ft.to, opt: {
          flatten: false,
          followSymlinks: true,
          relative: project.d.home
        }
      });
    }).then(() => {
      return Bluebird.resolve();
    })
  }
  return Bluebird.resolve();
}

export function installProject(project: Project) {
  return installHeaders(project)
    .then(() => {
      return bin(project);
    });
}

export function installEnvironment(env: Environment) {
  return libs(env).then(() => {
    return assets(env);
  });
}