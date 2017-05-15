import * as Bluebird from 'bluebird';
import * as path from 'path';
import { contains, flatten, each } from 'typed-json-transform';
import * as fs from 'fs';

import { defaults } from './defaults';
import { src, map, dest, wait, symlink } from 'tmake-file';
import { log } from './log';
import { args } from './runtime';
import { mv, mkdir } from 'shelljs';
import { stringHash, fileHash } from './hash';
import { Db } from './runtime';
import { startsWith } from './string';

import { Environment } from './environment';

function copy({ patterns, from, to, opt }: TMake.Install.CopyOptions): PromiseLike<string[]> {
  const filePaths: string[] = [];
  const stream = src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(map((data: TMake.Vinyl.File, callback: Function) => {
    const mut = data;
    if (opt.flatten) {
      mut.base = path.dirname(mut.path);
    }
    const newPath = path.join(to, path.relative(mut.base, mut.path));
    filePaths.push(path.relative(opt.relative, newPath));
    callback(null, mut);
  })).pipe(dest(to));
  return <any>wait(stream).then(() => {
    return Bluebird.resolve(filePaths);
  });
};

function link({ patterns, from, to, opt }: TMake.Install.CopyOptions): PromiseLike<string[]> {
  const filePaths: string[] = [];
  return <any>wait(src(patterns, {
    cwd: from,
    followSymlinks: opt.followSymlinks
  }).pipe(map((data: TMake.Vinyl.File, callback: Function) => {
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
    return Bluebird.resolve(filePaths);
  });
}

function bin(env: Environment) {
  if (contains(['executable'], env.outputType)) {
    const base = path.join(args.runDir, 'bin');
    mkdir('-p', path.join(args.runDir, 'bin'));
    const binaries: string[] = [];
    each(env.d.install.binaries, (ft: TMake.Install.Options) => {
      const from = path.join(ft.from, env.project.name);
      const to = path.join(ft.to || base, env.project.name);
      log.verbose(`[ install bin ] from ${from} to ${to}`);
      mv(from, to);
      binaries.push(to);
    });
    return Bluebird.resolve();
    // let cumulativeHash = '';
    // return Bluebird.each(binaries, (binPath) => {
    //   log.quiet('hash binary', binPath);
    //   return fileHash(binPath).then((hash) => {
    //     cumulativeHash = stringHash(cumulativeHash + hash);
    //     return Bluebird.resolve();
    //   });
    // })
  }
  return Bluebird.resolve();
}

function assets(env: Environment): PromiseLike<any> {
  if (env.d.install.assets) {
    return Bluebird.map(env.d.install.assets, (ft: TMake.Install.Options) => {
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
      env.cache.assets.set(flatten(assetPaths).join(', '));
      return Db.cacheEnvironment(env);
    });
  };
  return Bluebird.resolve();
}

function libs(env: Environment): PromiseLike<any> {
  if (contains(['static', 'dynamic'], env.outputType)) {
    return Bluebird.map(env.d.install.libraries, (ft: TMake.Install.Options) => {
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
        return Bluebird.resolve();
      }
      return Bluebird.each(flatten(libPaths), (libPath) => {
        fileHash(path.join(env.project.d.home, libPath));
      }).then((hash) => {
        return Db.updateProject(env.project, {
          $set: {
            'cache.libs': flatten(libPaths)
          }
        });
      });
    });
  }
  return Bluebird.resolve();
}

export function installHeaders(project: TMake.Project): PromiseLike<any> {
  if (contains([
    'static', 'dynamic'
  ], project.outputType)) {
    return Bluebird.each(project.d.install.headers, (ft: TMake.Install.Options) => {
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
  return Bluebird.resolve();
}

export function installProject(project: TMake.Project) {
  return installHeaders(project);
}

export function installEnvironment(env: Environment) {
  return libs(env).then(() => {
    return bin(env);
  }).then(() => {
    return assets(env);
  });
}