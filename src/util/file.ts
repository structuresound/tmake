import * as yaml from 'js-yaml';
import * as sh from 'shelljs';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as CSON from 'cson';
import map = require('map-stream');
import globAll = require('glob-all');
import { check } from 'js-object-tools';
import { src as _src, dest, symlink } from 'vinyl-fs';

import _unarchive from './archive';
import { startsWith } from './string';

interface BuildSettings {
  cFlags: Object;
  cxxFlags: Object;
  compilerFlags: Object;
  linkerFlags: Object;
  defines: Object;
  frameworks: Object;
  sources: Object;
  headers: Object;
  libs: Object;
  includeDirs: Object;
  outputFile: string;
}

interface InstallOptions {
  from: string;
  to?: string;
  sources?: string[];
  includeFrom?: string;
}

interface install_list {
  binaries?: InstallOptions[];
  headers?: InstallOptions[];
  libs?: InstallOptions[];
  assets?: InstallOptions[];
  libraries?: InstallOptions[];
}

interface DirList {
  root: string;
  home: string;
  clone: string;
  project: string;
  source: string;
  build: string;
  test: string;
  install: install_list;
  includeDirs: string[];
}

interface DebugCache {
  url?: string;
  metaConfiguration?: Object
}

interface Cache {
  url: string;
  metaData?: string;
  configuration?: string;
  buildFile?: string;
  metaConfiguration?: string;
  generatedBuildFile?: string;
  libs?: string;
  bin?: string;
  debug?: DebugCache;
}

interface GitSettings {
  repository?: string;
  url?: string;
  branch?: string;
  tag?: string;
  archive?: string;
}

interface Platform {
  architecture: string,
  endianness: string,
  compiler: string
  platform: string,
  cpu: { num: number, speed: string }
}

interface Tool {
  url: string,
  version: string,
  bin?: string,
  name?: string
}

interface Toolchain {
  ninja: Tool;
  clang: Tool;
}

class Configuration {
  [index: string]: any;
  name: string;
  override: Configuration;
  build: BuildSettings;
  configure: BuildSettings;
  path: DirList;
  deps: Configuration[];
  cache: Cache;
  fetch: { url?: string; }
  link: string;
  git: GitSettings;
  host: Platform;
  target: Platform;
  test: BuildSettings;
  toolchain: Toolchain;
  environment: any;
  d: DirList;
  p: DirList;
  outputType: string;
  version: string;
  tag: string;
  user: string;
  dir: string;
}

interface VinylFile {
  path: string;
  base: string;
  cwd?: string;
}

interface CopyOptions {
  followSymlinks?: boolean;
  flatten?: boolean;
  relative?: string;
  from?: string;
  to?: string;
}

function nuke(folderPath: string) {
  if (!folderPath || (folderPath === '/')) {
    throw new Error("don't nuke everything");
  } else if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        nuke(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    }
    return fs.rmdirSync(folderPath);
  }
};

function prune(folderPath: string): boolean {
  if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath);
    if (files.length) {
      let modified = false;
      for (const file of files) {
        const curPath = path.join(folderPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          if (prune(curPath)) {
            modified = true;
          }
        }
      }
      if (modified) {
        return prune(folderPath);
      }
      return false;
    }
    fs.rmdirSync(folderPath);
    return true;
  }
};

function wait(stream: any, readOnly?: boolean) {
  return new Promise<any>((resolve: Function, reject: Function) => {
    stream.on('error', reject);
    if (readOnly) {
      return stream.on('finish', resolve);
    }
    return stream.on('end', resolve);
  });
};

function deleteAsync(filePath: string) {
  return new Promise<boolean>((resolve: Function, reject: Function) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        reject(err);
      }
      resolve(1);
    })
  });
}

function _glob(srcPattern: string[], relative: string,
  cwd: string): Promise<any> {
  return new Promise((resolve: Function, reject: Function) => {
    return globAll(srcPattern,
      {
        cwd: cwd || process.cwd(),
        root: relative || process.cwd(),
        nonull: false
      },
      (err: Error, results: string[]) => {
        if (err) {
          reject(err);
        } else if (results) {
          resolve(_.map(results, (file: string) => {
            const filePath = path.join(cwd, file);
            if (relative) {
              return path.relative(relative, filePath);
            }
            return filePath;
          }));
        }
        reject('no files found');
      });
  });
}

function glob(patternS: any, relative: string, cwd: string): Promise<any> {
  let patterns: string[] = [];
  if (check(patternS, String)) {
    patterns.push(patternS);
  } else if (check(patternS, Array)) {
    patterns = patternS;
  }
  return _glob(patterns, relative, cwd);
};

function existsAsync(filePath: string): Promise<boolean> {
  return new Promise<boolean>((resolve: Function, reject: Function) => {
    if (!filePath) {
      reject(new Error('no specified clone directory'));
    }
    fs.exists(filePath, (exists: boolean) => { resolve(exists); });
  });
};

function readFileAsync(filePath: string, format: string = 'utf8') {
  return new Promise((resolve: Function, reject: Function) => fs.readFile(
    filePath, format, (err: Error, data: string) => {
      if (err) {
        reject(err);
      }
      return resolve(data);
    }));
};

function writeFileAsync(filePath: string, data: string,
  options?: Object): Promise<any> {
  return new Promise((resolve: Function, reject: Function) => {
    fs.writeFile(filePath, data, options, (err) => {
      if (err) {
        reject(err);
      }
      return resolve();
    });
  });
};

function findOneAsync(srcPattern: string[], relative: string,
  cwd: string): Promise<string> {
  return glob(srcPattern, relative, cwd)
    .then((array: string[]) => {
      if (array.length) {
        return Promise.resolve(array[0]);
      }
      return Promise.resolve(undefined);
    });
}

const defaultConfig = 'tmake';

function getConfigPath(configDir: string): string {
  const exts = ['yaml', 'json', 'cson'];
  for (const ext of exts) {
    const filePath = `${configDir}/${defaultConfig}.${ext}`;
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return '';
};

function findConfigAsync(configDir: string): Promise<string> {
  return Promise.resolve(getConfigPath(configDir));
}

function readConfigAsync(configDir: string): Promise<Configuration> {
  return findConfigAsync(configDir)
    .then((configPath: string) => parseFileAsync(configPath));
};

function parseFileAsync(configPath: string): Promise<Configuration> {
  if (configPath) {
    return readFileAsync(configPath, 'utf8')
      .then((data: string) => {
        return Promise.resolve(parseData(data, configPath));
      });
  }
  return Promise.resolve(undefined);
};

function parseFileSync(configPath: string): Configuration {
  const data = fs.readFileSync(configPath, 'utf8');
  return parseData(data, configPath);
};

function parseData(data: string, configPath: string) {
  switch (path.extname(configPath)) {
    case '.cson':
      return CSON.parse(data) as Configuration;
    case '.json':
      return JSON.parse(data);
    case '.yaml':
      return yaml.load(data);
    default:
      throw new Error('unknown config ext');
  }
}

function readIfExists(filePath: string) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
};

function readConfigSync(configDir: string) {
  const configPath = getConfigPath(configDir);
  if (configPath) {
    return parseFileSync(configPath);
  }
  return undefined;
};

function unarchive(archive: string, tempDir: string, toDir: string,
  toPath?: string) {
  return _unarchive(archive, tempDir)
    .then(() => moveArchive(tempDir, toDir, toPath));
};

function src(glob: string[], opt: Object) {
  const patterns = _.map(glob, (string) => {
    if (startsWith(string, '/')) {
      return string.slice(1);
    }
    return string;
  });
  return _src(patterns, opt);
}

function moveArchive(tempDir: string, toDir: string, toPath: string) {
  const files = fs.readdirSync(tempDir);
  if (files.length === 1) {
    let resolvedToPAth = toPath;
    const file = files[0];
    const fullPath = `${tempDir}/${file}`;
    if (fs.lstatSync(fullPath).isDirectory()) {
      if (fs.existsSync(toDir)) {
        nuke(toDir);
      }
      return sh.mv(fullPath, toDir);
    }
    if (typeof toPath === 'undefined' || toPath === null) {
      resolvedToPAth = `${toDir}/${file}`;
    }
    if (!fs.existsSync(toDir)) {
      sh.mkdir('-p', toDir);
    } else if (fs.existsSync(resolvedToPAth)) {
      fs.unlinkSync(resolvedToPAth);
    }
    return sh.mv(fullPath, resolvedToPAth);
  }
  if (!fs.existsSync(toDir)) {
    sh.mkdir('-p', toDir);
  }
  return files.forEach((file) => {
    const fullPath = `${tempDir}/${file}`;
    const newPath = path.join(toDir, file);
    return sh.mv(fullPath, newPath);
  });
};

export {
  nuke,
  glob,
  unarchive,
  moveArchive,
  existsAsync,
  findConfigAsync,
  readConfigSync,
  readConfigAsync,
  readIfExists,
  getConfigPath,
  parseFileSync,
  parseFileAsync,
  writeFileAsync,
  src,
  dest,
  map,
  prune,
  wait,
  symlink,
  InstallOptions,
  install_list,
  BuildSettings,
  Configuration,
  Platform,
  Cache,
  DirList,
  DebugCache,
  GitSettings,
  VinylFile,
  CopyOptions
};
