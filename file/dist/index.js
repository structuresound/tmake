"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Bluebird = require("bluebird");
var yaml = require("js-yaml");
var sh = require("shelljs");
var _ = require("lodash");
var fs = require("fs");
var path = require("path");
var CSON = require("cson");
var map = require("map-stream");
exports.map = map;
var globAll = require("glob-all");
var typed_json_transform_1 = require("typed-json-transform");
var vinyl_fs_1 = require("vinyl-fs");
exports.dest = vinyl_fs_1.dest;
exports.symlink = vinyl_fs_1.symlink;
var archive_1 = require("./archive");
exports.defaultConfig = 'tmake';
function startsWith(string, s) {
    return string.slice(0, s.length) === s;
}
function nuke(folderPath) {
    if (!folderPath || (folderPath === '/')) {
        throw new Error("don't nuke everything");
    }
    try {
        var files = fs.readdirSync(folderPath);
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            var curPath = path.join(folderPath, file);
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
        var files = fs.readdirSync(folderPath);
        if (files.length) {
            var modified = false;
            for (var _i = 0, files_2 = files; _i < files_2.length; _i++) {
                var file = files_2[_i];
                var curPath = path.join(folderPath, file);
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
    return new Bluebird(function (resolve, reject) {
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
    return new Bluebird(function (resolve, reject) {
        fs.unlink(filePath, function (err) {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}
exports.deleteAsync = deleteAsync;
function _glob(srcPattern, relative, cwd) {
    return new Bluebird(function (resolve, reject) {
        return globAll(srcPattern, {
            cwd: cwd || process.cwd(),
            root: relative || process.cwd(),
            nonull: false
        }, function (err, results) {
            if (err) {
                reject(err);
            }
            else if (results) {
                resolve(_.map(results, function (file) {
                    var filePath = path.join(cwd, file);
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
exports._glob = _glob;
function glob(patternS, relative, cwd) {
    var patterns = [];
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
function readFileAsync(filePath, format) {
    if (format === void 0) { format = 'utf8'; }
    return new Bluebird(function (resolve, reject) { return fs.readFile(filePath, format, function (err, data) {
        if (err) {
            reject(err);
        }
        return resolve(data);
    }); });
}
exports.readFileAsync = readFileAsync;
;
function writeFileAsync(filePath, data, options) {
    return new Bluebird(function (resolve, reject) {
        fs.writeFile(filePath, data, options, function (err) {
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
        .then(function (array) {
        if (array.length) {
            return Bluebird.resolve(array[0]);
        }
        return Bluebird.resolve(undefined);
    });
}
exports.findOneAsync = findOneAsync;
function getConfigPath(configDir) {
    var exts = ['yaml', 'json', 'cson'];
    for (var _i = 0, exts_1 = exts; _i < exts_1.length; _i++) {
        var ext = exts_1[_i];
        var filePath = configDir + "/" + exports.defaultConfig + "." + ext;
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return undefined;
}
exports.getConfigPath = getConfigPath;
;
function findConfigAsync(configDir) {
    return Bluebird.resolve(getConfigPath(configDir));
}
exports.findConfigAsync = findConfigAsync;
function readConfigAsync(configDir) {
    return findConfigAsync(configDir)
        .then(function (configPath) {
        if (configPath) {
            return parseFileAsync(configPath);
        }
        return Bluebird.resolve(undefined);
    });
}
exports.readConfigAsync = readConfigAsync;
;
function parseFileAsync(configPath) {
    return readFileAsync(configPath, 'utf8')
        .then(function (data) {
        return Bluebird.resolve(parseData(data, configPath));
    });
}
exports.parseFileAsync = parseFileAsync;
;
function parseFileSync(configPath) {
    var data = fs.readFileSync(configPath, 'utf8');
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
exports.parseData = parseData;
function readConfigSync(configDir) {
    var configPath = getConfigPath(configDir);
    if (configPath) {
        return parseFileSync(configPath);
    }
    return undefined;
}
exports.readConfigSync = readConfigSync;
;
function unarchive(archive, tempDir, toDir, toPath) {
    return archive_1.default(archive, tempDir).then(function () { return moveArchive(tempDir, toDir, toPath); });
}
exports.unarchive = unarchive;
;
function src(glob, opt) {
    var patterns = _.map(glob, function (string) {
        if (startsWith(string, '/')) {
            return string.slice(1);
        }
        return string;
    });
    return vinyl_fs_1.src(patterns, opt);
}
exports.src = src;
function moveArchive(tempDir, toDir, toPath) {
    var files = fs.readdirSync(tempDir);
    if (files.length === 1) {
        var resolvedToPAth = toPath;
        var file = files[0];
        var fullPath = tempDir + "/" + file;
        if (fs.lstatSync(fullPath).isDirectory()) {
            try {
                nuke(toDir);
            }
            catch (e) { }
            ;
            return sh.mv(fullPath, toDir);
        }
        if (typeof toPath === 'undefined' || toPath === null) {
            resolvedToPAth = toDir + "/" + file;
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
    return files.forEach(function (file) {
        var fullPath = tempDir + "/" + file;
        var newPath = path.join(toDir, file);
        return sh.mv(fullPath, newPath);
    });
}
exports.moveArchive = moveArchive;
;
