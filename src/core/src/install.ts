import * as Bluebird from 'bluebird';
import * as path from 'path';
import { setValueForKeyPath, contains, flatten, each } from 'typed-json-transform';
import * as fs from 'fs';

import { src, map, dest, wait, symlink } from './file';
import { log } from './log';
import { args } from './runtime';
import { mv, mkdir } from 'shelljs';
import { stringHash, fileHashSync } from './hash';
import { Runtime } from './runtime';
import { replaceAll, startsWith } from './string';
import { Configuration } from './configuration';
import { join } from 'path';
import { Product } from './index';

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
  const { parsed } = configuration;
  if (contains(['executable'], parsed.output.type)) {
    const base = path.join(args.runDir, 'bin', parsed.platform, parsed.architecture);
    mkdir('-p', base);
    const binaries: string[] = [];
    const ft = configuration.parsed.d.install.binaries;
    const from = path.join(ft.from, configuration.project.name);
    const to = path.join(ft.to || base, configuration.project.name);
    mv(from, to);
    binaries.push(to);
  }
  return Bluebird.resolve();
}

function assets(configuration: Configuration): PromiseLike<any> {
  const { glob } = configuration.parsed;

  if (configuration.parsed.d.install.assets) {
    const ft = configuration.parsed.d.install.assets;
      const patterns = ft.matching || glob.assets.images.concat(glob.assets.fonts);
      log.verbose(`[ install assets ] from ${ft.from} to ${ft.to}`);
      return copy({
        patterns, from: ft.from, to: ft.to, opt: {
          flatten: false,
          relative: configuration.project.parsed.d.home,
          followSymlinks: true
        }
      }).then(assetPaths => {
      configuration.cache.assets.set(assetPaths.join(', '));
      return configuration.update();
    });
  };
  return Bluebird.resolve();
}

function libs(configuration: Configuration): PromiseLike<any> {
  const { output } = configuration.parsed;

  if (contains(['static', 'dynamic'], configuration.parsed.output.type)) {
      const ft = configuration.parsed.d.install.libraries;
      let patterns = ft.matching || ['**/*.a'];
      if (output.type === 'dynamic') {
        patterns = ft.matching || ['**/*.dylib', '**/*.so', '**/*.dll'];
      }
      log.verbose(`[ install libs ] from ${ft.from} to ${ft.to}`);
      return link({
        patterns, from: ft.from, to: ft.to, opt: {
          flatten: true,
          followSymlinks: false,
          relative: configuration.project.parsed.d.home
        }
      }).then((libPaths) => {
      if (!libPaths.length) {
        return Bluebird.resolve();
      }
      const checksums: any = {};
      each(libPaths, (lib) => {
        checksums[stringHash(path.basename(lib))] = fileHashSync(path.join(configuration.project.parsed.d.home, lib));
      });
      configuration.cache.libs.set(libPaths);
      configuration.cache.checksums.set(checksums);
      return configuration.update();
    });
  }
  return Bluebird.resolve();
}


export function lipo(project: TMake.Product): PromiseLike<any> {
  const { glob, output } = project.parsed;
  if (!output.lipo){
    return Bluebird.resolve();
  }
  console.log('lipo', project.parsed.libs);
  return Bluebird.resolve();
}

export function installHeaders(project: TMake.Product): PromiseLike<any> {
  const { glob, output } = project.parsed;
  if (contains([
    'static', 'dynamic'
  ], output.type)) {
    const iter = Object.keys(project.platforms);
    return Bluebird.map(iter, (platformName: string) => {
    const ft = project.parsed.d.install.headers;
    const to = join(ft.to, platformName, project.name);
    const patterns = ft.matching || glob.headers;
    if (args.verbose) {
      log.add('[ install headers ]', patterns, '\nfrom', ft.from, '\nto', to);
    }
    return link({
      patterns, from: ft.from, to: to, opt: {
        flatten: false,
        followSymlinks: true,
        relative: project.parsed.d.home
      }
    });
  });
  }
  return Bluebird.resolve();
}

export function installProject(project: TMake.Product) {
  // return installHeaders(project).then(() => {
    return lipo(project).then(() => {
      const projectEntry = project.toRegistry();
      // log.log('register package', projectEntry);
      return Runtime.Db.registerPackage(projectEntry);
    })
  // });
}

export function installConfiguration(configuration: Configuration) {
  return libs(configuration).then(() => {
    return bin(configuration);
  }).then(() => {
    return assets(configuration);
  });
}
