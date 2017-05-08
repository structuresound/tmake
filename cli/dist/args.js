"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimist = require("minimist");
const path = require("path");
const fs = require("fs");
const typed_json_transform_1 = require("typed-json-transform");
const tmake_core_1 = require("tmake-core");
exports.args = minimist(process.argv.slice(2));
function homeDir() {
    return process.env[process.platform === 'win32'
        ? 'USERPROFILE'
        : 'HOME'];
}
const runDir = process.cwd();
if (!exports.args.runDir) {
    exports.args.runDir = runDir;
}
if (!exports.args.configDir) {
    exports.args.configDir = exports.args.runDir;
}
const npmDir = path.join(path.dirname(fs.realpathSync(__filename)), '../');
const settingsDir = path.join(npmDir, 'settings');
if (!exports.args.npmDir) {
    exports.args.npmDir = npmDir;
}
if (!exports.args.cachePath) {
    exports.args.cachePath = 'trie_modules';
}
if (!exports.args.program) {
    exports.args.program = 'tmake';
}
if (!exports.args.userCache) {
    exports.args.userCache = `${homeDir()}/.tmake`;
}
if (exports.args.v) {
    if (!exports.args.verbose) {
        exports.args.verbose = exports.args.v;
    }
}
if (exports.args.f) {
    exports.args.force = 'all';
}
if (process.env.TMAKE_ARGS) {
    typed_json_transform_1.extend(exports.args, tmake_core_1.decodeArgs(process.env.TMAKE_ARGS));
}
tmake_core_1.initArgs(exports.args);
