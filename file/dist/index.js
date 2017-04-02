"use strict";
const yaml = require("js-yaml");
const sh = require("shelljs");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const CSON = require("cson");
const map = require("map-stream");
exports.map = map;
const globAll = require("glob-all");
const typed_json_transform_1 = require("typed-json-transform");
const vinyl_fs_1 = require("vinyl-fs");
exports.dest = vinyl_fs_1.dest;
exports.symlink = vinyl_fs_1.symlink;
const archive_1 = require("./archive");
function startsWith(string, s) {
    return string.slice(0, s.length) === s;
}
function nuke(folderPath) {
    if (!folderPath || (folderPath === '/')) {
        throw new Error("don't nuke everything");
    }
    try {
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                nuke(curPath);
            }
            else {
                fs.unlinkSync(curPath);
            }
        }
        return fs.rmdirSync(folderPath);
    }
    catch (e) {
    }
}
exports.nuke = nuke;
;
function prune(folderPath) {
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
    }
    catch (e) {
        return false;
    }
}
exports.prune = prune;
;
function wait(stream, readOnly) {
    return new Promise((resolve, reject) => {
        stream.on('error', reject);
        if (readOnly) {
            return stream.on('finish', resolve);
        }
        return stream.on('end', resolve);
    });
}
exports.wait = wait;
;
function deleteAsync(filePath) {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}
function _glob(srcPattern, relative, cwd) {
    return new Promise((resolve, reject) => {
        return globAll(srcPattern, {
            cwd: cwd || process.cwd(),
            root: relative || process.cwd(),
            nonull: false
        }, (err, results) => {
            if (err) {
                reject(err);
            }
            else if (results) {
                resolve(_.map(results, (file) => {
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
function glob(patternS, relative, cwd) {
    let patterns = [];
    if (typed_json_transform_1.check(patternS, String)) {
        patterns.push(patternS);
    }
    else if (typed_json_transform_1.check(patternS, Array)) {
        patterns = patternS;
    }
    return _glob(patterns, relative, cwd);
}
exports.glob = glob;
;
function readIfExists(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    }
    catch (e) {
        return '';
    }
}
exports.readIfExists = readIfExists;
function readFileAsync(filePath, format = 'utf8') {
    return new Promise((resolve, reject) => fs.readFile(filePath, format, (err, data) => {
        if (err) {
            reject(err);
        }
        return resolve(data);
    }));
}
;
function writeFileAsync(filePath, data, options) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, options, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}
exports.writeFileAsync = writeFileAsync;
;
function findOneAsync(srcPattern, relative, cwd) {
    return glob(srcPattern, relative, cwd)
        .then((array) => {
        if (array.length) {
            return Promise.resolve(array[0]);
        }
        return Promise.resolve(undefined);
    });
}
const defaultConfig = 'tmake';
function getConfigPath(configDir) {
    const exts = ['yaml', 'json', 'cson'];
    for (const ext of exts) {
        const filePath = `${configDir}/${defaultConfig}.${ext}`;
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return undefined;
}
exports.getConfigPath = getConfigPath;
;
function findConfigAsync(configDir) {
    return Promise.resolve(getConfigPath(configDir));
}
exports.findConfigAsync = findConfigAsync;
function readConfigAsync(configDir) {
    return findConfigAsync(configDir)
        .then((configPath) => {
        if (configPath) {
            return parseFileAsync(configPath);
        }
        return Promise.resolve(undefined);
    });
}
exports.readConfigAsync = readConfigAsync;
;
function parseFileAsync(configPath) {
    return readFileAsync(configPath, 'utf8')
        .then((data) => {
        return Promise.resolve(parseData(data, configPath));
    });
}
exports.parseFileAsync = parseFileAsync;
;
function parseFileSync(configPath) {
    const data = fs.readFileSync(configPath, 'utf8');
    return parseData(data, configPath);
}
exports.parseFileSync = parseFileSync;
;
function parseData(data, configPath) {
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
}
function readConfigSync(configDir) {
    const configPath = getConfigPath(configDir);
    if (configPath) {
        return parseFileSync(configPath);
    }
    return undefined;
}
exports.readConfigSync = readConfigSync;
;
function unarchive(archive, tempDir, toDir, toPath) {
    return archive_1.default(archive, tempDir)
        .then(() => moveArchive(tempDir, toDir, toPath));
}
exports.unarchive = unarchive;
;
function src(glob, opt) {
    const patterns = _.map(glob, (string) => {
        if (startsWith(string, '/')) {
            return string.slice(1);
        }
        return string;
    });
    return vinyl_fs_1.src(patterns, opt);
}
exports.src = src;
function moveArchive(tempDir, toDir, toPath) {
    const files = fs.readdirSync(tempDir);
    if (files.length === 1) {
        let resolvedToPAth = toPath;
        const file = files[0];
        const fullPath = `${tempDir}/${file}`;
        if (fs.lstatSync(fullPath).isDirectory()) {
            try {
                nuke(toDir);
            }
            catch (e) { }
            ;
            return sh.mv(fullPath, toDir);
        }
        if (typeof toPath === 'undefined' || toPath === null) {
            resolvedToPAth = `${toDir}/${file}`;
        }
        sh.mkdir('-p', toDir);
        try {
            fs.unlinkSync(resolvedToPAth);
        }
        catch (e) { }
        try {
            sh.mv(fullPath, resolvedToPAth);
        }
        catch (e) { }
    }
    sh.mkdir('-p', toDir);
    return files.forEach((file) => {
        const fullPath = `${tempDir}/${file}`;
        const newPath = path.join(toDir, file);
        return sh.mv(fullPath, newPath);
    });
}
exports.moveArchive = moveArchive;
;
