import * as Bluebird from 'bluebird';
import * as path from 'path';
import { setValueForKeyPath, contains, flatten, each } from 'typed-json-transform';
import * as fs from 'fs';

import { defaults } from './defaults';
import { src, map, dest, wait, symlink } from './file';
import { log } from './log';
import { args } from './runtime';
import { mv, mkdir } from 'shelljs';
import { stringHash, fileHashSync } from './hash';
import { Runtime } from './runtime';
import { replaceAll, startsWith } from './string';
import { Configuration } from './configuration';

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

function bin(configuration: Configuration) {
  if (contains(['executable'], configuration.post.outputType)) {
    const base = path.join(args.runDir, 'bin');
    mkdir('-p', path.join(args.runDir, 'bin'));
    const binaries: string[] = [];
    each(configuration.post.d.install.binaries, (ft: TMake.Install.Options) => {
      const from = path.join(ft.from, configuration.project.post.name);
      const to = path.join(ft.to || base, configuration.project.post.name);
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

function assets(configuration: Configuration): PromiseLike<any> {
  if (configuration.post.d.install.assets) {
    return Bluebird.map(configuration.post.d.install.assets, (ft: TMake.Install.Options) => {
      const patterns = ft.matching || defaults.assets.images.glob.concat(defaults.assets.fonts.glob);
      log.verbose(`[ install assets ] from ${ft.from} to ${ft.to}`);
      return copy({
        patterns, from: ft.from, to: ft.to, opt: {
          flatten: false,
          relative: configuration.project.post.d.home,
          followSymlinks: true
        }
      });
    }).then(assetPaths => {
      configuration.cache.assets.set(flatten(assetPaths).join(', '));
      return configuration.update();
    });
  };
  return Bluebird.resolve();
}

function libs(configuration: Configuration): PromiseLike<any> {
  if (contains(['static', 'dynamic'], configuration.post.outputType)) {
    return Bluebird.map(configuration.post.d.install.libraries, (ft: TMake.Install.Options) => {
      let patterns = ft.matching || ['**/*.a'];
      if (configuration.post.outputType === 'dynamic') {
        patterns = ft.matching || ['**/*.dylib', '**/*.so', '**/*.dll'];
      }
      log.verbose(`[ install libs ] from ${ft.from} to ${ft.to}`);
      return link({
        patterns, from: ft.from, to: ft.to, opt: {
          flatten: true,
          followSymlinks: false,
          relative: configuration.project.post.d.home
        }
      });
    }).then((libPaths) => {
      if (!libPaths.length) {
        return Bluebird.resolve();
      }
      const checksums: any = {};
      const libs = flatten(libPaths);
      configuration.project.cache.libs.set(libs)
      each(libs, (lib) => {
        checksums[stringHash(path.basename(lib))] = fileHashSync(path.join(configuration.project.post.d.home, lib));
      });
      return Runtime.Db.updateProject(configuration.project, {
        $set: {
          'cache.checksums': checksums,
          'cache.libs': libs
        }
      });
    });
  }
  return Bluebird.resolve();
}

export function installHeaders(project: TMake.Project): PromiseLike<any> {
  if (contains([
    'static', 'dynamic'
  ], project.post.outputType)) {
    return Bluebird.each(project.post.d.install.headers, (ft: TMake.Install.Options) => {
      const patterns = ft.matching || defaults.headers.glob;
      if (args.verbose) {
        log.add('[ install headers ]', patterns, '\nfrom', ft.from, '\nto', ft.to);
      }
      return link({
        patterns, from: ft.from, to: ft.to, opt: {
          flatten: false,
          followSymlinks: true,
          relative: project.post.d.home
        }
      });
    })
  }
  return Bluebird.resolve();
}

export function installProject(project: TMake.Project) {
  return installHeaders(project);
}

export function installConfiguration(configuration: Configuration) {
  return libs(configuration).then(() => {
    return bin(configuration);
  }).then(() => {
    return assets(configuration);
  });
}