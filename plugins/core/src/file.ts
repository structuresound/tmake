import * as Bluebird from 'bluebird';
import * as yaml from 'js-yaml';
import * as sh from 'shelljs';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import map = require('map-stream');
import globAll = require('glob-all');
import { check, arrayify } from 'typed-json-transform';
import { src as _src, dest, symlink } from 'vinyl-fs';
import decompress = require('decompress');

export { map, symlink, dest };

export const defaultConfig = 'tmake';

function startsWith(string: string, s: string) {
  return string.slice(0, s.length) === s;
}

export function nuke(folderPath: string) {
  if (!folderPath || (folderPath === '/')) {
    throw new Error("don't nuke everything");
  }
  try {
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
  } catch (e) {

  }
};

export function prune(folderPath: string): boolean {
  try {
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
  } catch (e) {
    return false;
  }
};

export function wait(stream: any, readOnly?: boolean) {
  return new Bluebird<any>((resolve: Function, reject: Function) => {
    stream.on('error', reject);
    if (readOnly) {
      return stream.on('finish', resolve);
    }
    return stream.on('end', resolve);
  });
};

export function deleteAsync(filePath: string) {
  return new Bluebird<void>((resolve: Function, reject: Function) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    })
  });
}

export function _glob(srcPattern: string[], relative: string,
  cwd: string) {
  return new Bluebird<string[]>((resolve: Function, reject: Function) => {
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

export function glob(patterns: any, relative: string, cwd: string) {
  return _glob(arrayify(patterns), relative, cwd);
};

export function readIfExists(filePath: string) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '';
  }
}

export function readFileAsync(filePath: string, format: string = 'utf8') {
  return new Bluebird<string>((resolve: Function, reject: Function) => fs.readFile(
    filePath, format, (err: Error, data: string) => {
      if (err) {
        reject(err);
      }
      return resolve(data);
    }));
};

export function writeFileAsync(filePath: string, data: string,
  options?: Object) {
  return new Bluebird<void>((resolve: Function, reject: Function) => {
    fs.writeFile(filePath, data, options, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
};

export function findOneAsync(srcPattern: string[], relative: string,
  cwd: string) {
  return glob(srcPattern, relative, cwd)
    .then((array: string[]) => {
      if (array.length) {
        return Bluebird.resolve(array[0]);
      }
      return Bluebird.resolve(undefined);
    });
}


export function getConfigPath(configDir: string): string {
  const exts = ['yaml', 'json'];
  for (const ext of exts) {
    const filePath = `${configDir}/${defaultConfig}.${ext}`;
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return <string>undefined;
};

export function findConfigAsync(configDir: string) {
  return Bluebird.resolve(getConfigPath(configDir));
}

export function readConfigAsync(configDir: string) {
  return findConfigAsync(configDir)
    .then((configPath: string) => {
      if (configPath) {
        return parseFileAsync(configPath);
      }
      return Bluebird.resolve(<any>undefined);
    });
};

export function parseFileAsync(configPath: string) {
  return readFileAsync(configPath, 'utf8')
    .then((data: string) => {
      return Bluebird.resolve(parseData(data, configPath));
    });
};

export function parseFileSync(configPath: string) {
  const data = fs.readFileSync(configPath, 'utf8');
  return parseData(data, configPath);
};

export function parseData(data: string, configPath: string): any {
  switch (path.extname(configPath)) {
    case '.json':
      return JSON.parse(data);
    case '.yaml':
      return yaml.load(data);
    default:
      throw new Error('unknown config ext');
  }
}

export function readConfigSync(configDir: string) {
  const configPath = getConfigPath(configDir);
  if (configPath) {
    return parseFileSync(configPath);
  }
  return undefined;
};

export function unarchive(archive: string, tempDir: string, toDir: string,
  toPath?: string) {
  return decompress(archive, tempDir).then(() => moveArchive(tempDir, toDir, toPath));
};

export function src(_patterns: string[], opt: Object) {
  const patterns = _.map(_patterns, (string) => {
    if (startsWith(string, '/')) {
      return string.slice(1);
    }
    return string;
  });
  return _src(patterns, opt);
}

export function moveArchive(tempDir: string, toDir: string, toPath: string) {
  const files = fs.readdirSync(tempDir);
  if (files.length === 1) {
    let resolvedToPAth = toPath;
    const file = files[0];
    const fullPath = `${tempDir}/${file}`;
    if (fs.lstatSync(fullPath).isDirectory()) {
      try {
        nuke(toDir);
      } catch (e) { };
      return sh.mv(fullPath, toDir);
    }
    if (typeof toPath === 'undefined' || toPath === null) {
      resolvedToPAth = `${toDir}/${file}`;
    }
    sh.mkdir('-p', toDir);
    try {
      fs.unlinkSync(resolvedToPAth);
    } catch (e) { }
    try {
      sh.mv(fullPath, resolvedToPAth);
    } catch (e) { }
  }
  sh.mkdir('-p', toDir);
  return files.forEach((file) => {
    const fullPath = `${tempDir}/${file}`;
    const newPath = path.join(toDir, file);
    return sh.mv(fullPath, newPath);
  });
};