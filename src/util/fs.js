import yaml from 'js-yaml';
import sh from 'shelljs';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import CSON from 'cson';
import glob from 'glob-all';
import vinyl from 'vinyl-fs';
import map from 'map-stream';
import {check} from 'js-object-tools';

import log from './log';
import {unarchive} from './archive';

fs.nuke = (folderPath) => {
  if (!folderPath || (folderPath === '/')) {
    throw new Error("don't nuke everything");
  } else if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        fs.nuke(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    }
    return fs.rmdirSync(folderPath);
  }
};

fs.prune = (folderPath) => {
  if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath);
    if (files.length) {
      let modified = false;
      for (const file of files) {
        const curPath = path.join(folderPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          if (fs.prune(curPath)) {
            modified = true;
          }
        }
      }
      if (modified) {
        return fs.prune(folderPath);
      }
      return false;
    }
    fs.rmdirSync(folderPath);
    return true;
  }
};

fs.src = vinyl.src;
fs.dest = vinyl.dest;
fs.wait = function wait(stream, readOnly) {
  return (resolve, reject) => {
    stream.on('error', reject);
    if (readOnly) {
      return stream.on('finish', resolve);
    }
    return stream.on('end', resolve);
  };
};

fs.deleteAsync = filePath => new Promise((resolve, reject) => fs.unlink(filePath, (err) => {
  if (err) {
    return reject(err);
  }
  return resolve(1);
}));

fs.map = map;
fs._glob = function _glob(srcPattern, relative, cwd) {
  return new Promise((resolve, reject) => {
    return glob(srcPattern, {
      cwd: cwd || process.cwd(),
      root: relative || process.cwd(),
      nonull: false
    }, (er, results) => {
      if (er) {
        return reject(er);
      } else if (results) {
        return resolve(_.map(results, (file) => {
          const filePath = path.join(cwd, file);
          if (relative) {
            return path.relative(relative, filePath);
          }
          return filePath;
        }));
      }
      return reject('no files found');
    });
  });
};

fs.glob = (patternS, relative, cwd) => {
  let patterns = [];
  if (check(patternS, String)) {
    patterns.push(patternS);
  } else if (check(patternS, Array)) {
    patterns = patternS;
  }
  return fs._glob(patterns, relative, cwd);
};

fs.existsAsync = function fsExistsAsync(filePath) {
  return new Promise((resolve) => fs.exists(filePath, exists => resolve(exists)));
};

fs.readFileAsync = function readFileAsync(filePath, format) {
  return new Promise((resolve, reject) => fs.readFile(filePath, format, (err, data) => {
    if (err) {
      reject(err);
    }
    return resolve(data);
  }));
};

fs.writeFileAsync = function writeFileAsync(filePath, data, options) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, options, (err) => {
      if (err) {
        reject(err);
      }
      return resolve(data);
    });
  });
};

fs.findAsync = fs.glob;
fs.findOneAsync = (srcPattern, relative, cwd) => fs
  .findAsync(srcPattern, relative, cwd)
  .then((array) => {
    if (array.length) {
      return Promise.resolve(array[0]);
    }
    return Promise.resolve(undefined);
  });

const defaultConfig = 'tmake';

fs.configExists = function configExists(configDir) {
  const exts = ['yaml', 'json', 'cson'];
  for (const ext of exts) {
    const filePath = `${configDir}/${defaultConfig}.${ext}`;
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  log.error(`no tmake.{yaml, json, cson} file present at ${configDir}`);
  return false;
};

fs.findConfigAsync = configDir => Promise.resolve(fs.configExists(configDir));

fs.readConfigAsync = function readConfigAsync(configDir) {
  return fs
    .findConfigAsync(configDir)
    .then((configPath) => fs.parseFileAsync(configPath));
};

fs.parseFileAsync = function parseFileAsync(configPath) {
  if (configPath) {
    return fs
      .readFileAsync(configPath, 'utf8')
      .then((data) => {
        switch (path.extname(configPath)) {
          case '.cson':
            return Promise.resolve(CSON.parse(data));
          case '.json':
            return Promise.resolve(JSON.parse(data));
          case '.yaml':
            return Promise.resolve(yaml.load(data));
          default:
            return Promise.reject('unknown config type', configPath);
        }
      });
  }
  return Promise.resolve(undefined);
};

fs.parseFileSync = function parseFileSync(configPath) {
  const data = fs.readFileSync(configPath, 'utf8');
  switch (path.extname(configPath)) {
    case '.cson':
      return CSON.parse(data);
    case '.json':
      return JSON.parse(data);
    case '.yaml':
      return yaml.load(data);
    default:
      throw new Error('unknown config ext');
  }
};

fs.readIfExists = function fsReadIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
};

fs.readConfigSync = function fsReadConfigSync(configDir) {
  const configPath = fs.configExists(configDir);
  if (configPath) {
    return fs.parseFileSync(configPath);
  }
  return {};
};

fs.unarchive = function fsUnarchive(archive, tempDir, toDir, toPath) {
  return unarchive(archive, tempDir).then(() => fs.moveArchive(tempDir, toDir, toPath));
};

fs.moveArchive = (tempDir, toDir, toPath) => {
  const files = fs.readdirSync(tempDir);
  if (files.length === 1) {
    let resolvedToPAth = toPath;
    const file = files[0];
    const fullPath = `${tempDir}/${file}`;
    if (fs.lstatSync(fullPath).isDirectory()) {
      if (fs.existsSync(toDir)) {
        fs.nuke(toDir);
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

export default fs;
