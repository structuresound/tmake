import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import { contains } from 'js-object-tools';
import * as fs from 'fs';

import { defaults } from './defaults';
import { VinylOptions, VinylFile, src, map, dest, wait, symlink } from './file';
import { log } from './log';
import { args } from './args';
import { mv, mkdir } from './sh';
import { stringHash, fileHash } from './hash';
import { updateProject, updateEnvironment } from './db';
import { startsWith } from './string';

import { Project } from './project';
import { Environment } from './environment';

export interface InstallOptions {
  from: string;
  to?: string;
  matching?: string[];
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
      // console.log('flatten', mut.base);
    }
    const newPath = path.join(to, path.relative(mut.base, mut.path));
    if (opt.flatten) {
      // console.log('add link', path.relative(opt.relative, newPath));
    }
    filePaths.push(path.relative(opt.relative, newPath));
    callback(null, mut);
  })).pipe(symlink(to))).then(() => {
    return Promise.resolve(filePaths);
  });
}

function bin(env: Environment) {
  if (contains(['executable'], env.outputType)) {
    const base = path.join(args.runDir, 'bin');
    mkdir('-p', path.join(args.runDir, 'bin'));
    const binaries: string[] = [];
    _.each(env.d.install.binaries, (ft: InstallOptions) => {
      const from = path.join(ft.from, env.project.name);
      const to = path.join(ft.to || base, env.project.name);
      log.verbose(`[ install bin ] from ${from} to ${to}`);
      mv(from, to);
      binaries.push(to);
    });
    return Promise.resolve();
    // let cumulativeHash = '';
    // return Bluebird.each(binaries, (binPath) => {
    //   log.quiet('hash binary', binPath);
    //   return fileHash(binPath).then((hash) => {
    //     cumulativeHash = stringHash(cumulativeHash + hash);
    //     return Promise.resolve();
    //   });
    // })
  }
  return Promise.resolve();
}

function assets(env: Environment): PromiseLike<any> {
  if (env.d.install.assets) {
    return Bluebird.map(env.d.install.assets, (ft: InstallOptions) => {
      const patterns = ft.matching || defaults.assets.images.glob.concat(defaults.assets.fonts.glob);
      log.verbose(`[ install assets ] from ${ft.from} to ${ft.to}`);
      return copy({
        patterns, from: ft.from, to: ft.to, opt: {
          flatten: false,
          relative: env.project.d.home,
          followSymlinks: true
        }
      });
    }).then(assetPaths => {
      env.cache.assets.set(_.flatten(assetPaths));
      return updateEnvironment(env);
    });
  };
  return Promise.resolve();
}

function libs(env: Environment): PromiseLike<any> {
  if (contains([
    'static', 'dynamic'
  ], env.outputType)) {
    return Bluebird.map(env.d.install.libraries, (ft: InstallOptions) => {
      let patterns = ft.matching || ['**/*.a'];
      if (env.project.outputType === 'dynamic') {
        patterns = ft.matching || ['**/*.dylib', '**/*.so', '**/*.dll'];
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
      if (!libPaths.length) {
        return Promise.resolve();
      }
      return Bluebird.each(_.flatten(libPaths), (libPath) => {
        fileHash(path.join(env.project.d.home, libPath));
      }).then((hash) => {
        return updateProject(env.project, {
          $set: {
            'cache.libs': _.flatten(libPaths)
          }
        });
      });
    });
  }
  return Promise.resolve();
}

export function installHeaders(project: Project): PromiseLike<any> {
  if (contains([
    'static', 'dynamic'
  ], project.outputType)) {
    return Bluebird.each(project.d.install.headers, (ft: InstallOptions) => {
      const patterns = ft.matching || defaults.headers.glob;
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
    })
  }
  return Promise.resolve();
}

export function installProject(project: Project) {
  return installHeaders(project);
}

export function installEnvironment(env: Environment) {
  return libs(env).then(() => {
    return bin(env);
  }).then(() => {
    return assets(env);
  });
}