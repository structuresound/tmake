"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var Bluebird = require("bluebird");
var _ = require("lodash");
var colors = require("chalk");
var path = require("path");
var yaml = require("js-yaml");
var typed_json_transform_1 = require("typed-json-transform");
var tmake_core_1 = require("tmake-core");
var db_1 = require("./db");
var example_1 = require("./example");
var tmake_core_2 = require("tmake-core");
var name = 'tmake';
function sortKeysBy(obj, comparator) {
    var keys = _.sortBy(_.keys(obj), function (key) {
        if (comparator) {
            return comparator(obj[key], key);
        }
        return key;
    });
    var sorted = {};
    _.each(keys, function (key) { sorted[key] = obj[key]; });
    return sorted;
}
exports.sortKeysBy = sortKeysBy;
var c = { g: colors.green, y: colors.yellow };
function packageCommand(desc) {
    return {
        name: 'package',
        type: ['String', 'Undefined'],
        typeName: 'optional string',
        description: desc
    };
}
exports.packageCommand = packageCommand;
function packageCommands() {
    return {
        ls: packageCommand("list state of a " + c.y('package') + " from the local " + name + " database"),
        install: packageCommand('copy libs and headers to destination'),
        all: packageCommand('fetch, update, build, install'),
        fetch: packageCommand("git / get dependencies for all or " + c.y('package')),
        configure: packageCommand("configure build system " + c.y('package')),
        build: packageCommand("build this project or dependency " + c.y('package')),
        push: packageCommand("upload the current config file to the " + name + " package repository"),
        link: packageCommand("link the current or specified " + c.y('package') + " to your local package repository"),
        unlink: packageCommand("remove the current or specified " + c.y('package') + " from your local package repository"),
        clean: packageCommand("clean " + c.y('package') + ", or 'all'"),
        parse: packageCommand("parse project, " + c.y('setting') + ", or 'package'"),
        graph: packageCommand("list dependencies of " + c.y('project') + ", or 'all'"),
        rm: packageCommand("remove file cache, " + c.y('package') + ", or 'all'"),
        test: packageCommand("test this project or dependency " + c.y('package')),
    };
}
exports.packageCommands = packageCommands;
function globalCommands() {
    return {
        example: {
            name: 'example',
            type: ['String', 'Undefined'],
            typeName: 'optional',
            description: [
                "copy an " + c.y('example') + " to the current directory",
                "the default is a c++11 http server: " + c.y('served')
            ]
        },
        reset: { description: 'nuke the cache' },
        nuke: { description: 'nuke the cache' },
        init: { description: 'create new tmake project file @ tmake.yaml' },
        help: { description: 'usage guide' },
        report: { description: 'show details of an error report' },
        version: { description: "get current version of " + name }
    };
}
exports.globalCommands = globalCommands;
function commands() {
    return __assign({}, packageCommands(), globalCommands());
}
exports.commands = commands;
function version() {
    var packageInfo = tmake_core_2.parseFileSync(path.join(tmake_core_1.args.npmDir, 'package.json'));
    var info = _.pick(packageInfo, ['name', 'version', 'homepage', 'author']);
    tmake_core_1.log.log(info);
}
exports.version = version;
function parseOptions(cmd) {
    if (!commands()[cmd]) {
        throw new Error("unknown command " + cmd);
    }
    return commands()[cmd];
}
exports.parseOptions = parseOptions;
function usage(cmd) {
    var o = parseOptions(cmd);
    return colors.gray('usage:') + " " + name + " " + colors.green(cmd) + " " + colors.yellow(o.name) + " \n" + colors.gray(o.description);
}
exports.usage = usage;
function manual() {
    var man = "\n  " + colors.gray('usage:') + " " + name + " " + colors.green('command') + " " + colors.yellow('option') + "\n  ";
    _.each(sortKeysBy(commands()), function (o, cmd) {
        if (o.name) {
            man +=
                "           " + colors.green(cmd) + " " + colors.yellow(o.name) + " " + colors.gray(o.typeName || o.type) + "\n";
        }
        else {
            man += "           " + colors.green(cmd) + "\n";
        }
        if (typed_json_transform_1.check(o.description, Array)) {
            _.each(o.description, function (d) { man += colors.gray("              " + d + "\n"); });
        }
        else {
            man += colors.gray("              " + o.description + "\n");
        }
    });
    return man;
}
exports.manual = manual;
exports.defaultPackage = {
    name: 'newProject',
    version: '0.0.1',
    outputType: 'executable',
    build: { with: 'cmake' }
};
function createPackage() {
    return Bluebird.resolve(exports.defaultPackage);
}
exports.createPackage = createPackage;
function tmake(rootConfig, positionalArgs, projectName) {
    if (positionalArgs === void 0) { positionalArgs = tmake_core_1.args._; }
    var Db = new db_1.ClientDb();
    tmake_core_1.Runtime.init(Db);
    if (!projectName) {
        projectName = positionalArgs[1] || rootConfig.name || tmake_core_1.Project.resolveName(rootConfig);
    }
    var command = positionalArgs[0];
    switch (command) {
        case 'rm':
            return Db.cleanConfigurations(projectName)
                .then(function () {
                return Db.removeProject(projectName);
            }).then(function () {
                tmake_core_1.log.quiet("cleared cache for " + projectName);
            });
        case 'unlink':
            return Db.projectNamed(projectName)
                .then(function (dep) { return tmake_core_1.unlink(dep || rootConfig); });
        case 'ls':
        case 'list':
            return (function () {
                if (positionalArgs[1] === 'local') {
                    return tmake_core_1.list('user', { name: positionalArgs[2] });
                }
                else if (positionalArgs[1]) {
                    return tmake_core_1.list('cache', { $or: [{ name: positionalArgs[1] }, { project: positionalArgs[1] }] });
                }
                return tmake_core_1.list('cache', {});
            })().then(function (nodes) { return tmake_core_1.log.log(nodes); });
        case 'report':
            return Db.getReports().then(function (reports) {
                reports.forEach(function (report) {
                    tmake_core_1.log.log(report);
                });
            });
        default:
            if (typed_json_transform_1.contains(Object.keys(packageCommands()), command)) {
                tmake_core_1.Runtime.loadPlugins();
                return tmake_core_1.execute(rootConfig, command, projectName);
            }
            throw new Error("unknown command " + positionalArgs[0]);
    }
}
exports.tmake = tmake;
function initRepo() {
    if (!tmake_core_2.findConfigAsync(tmake_core_1.args.runDir)) {
        return createPackage().then(function (config) {
            return tmake_core_2.writeFileAsync(tmake_core_1.args.runDir + "/tmake.yaml", yaml.dump(config));
        });
    }
    return tmake_core_1.log.quiet('aborting init, this folder already has a package file present');
}
exports.initRepo = initRepo;
function run() {
    var defaultCommand = false;
    if (tmake_core_1.args._[0] == null) {
        tmake_core_1.args._[0] = 'all';
        defaultCommand = true;
    }
    if (tmake_core_1.args.version) {
        return version();
    }
    switch (tmake_core_1.args._[0]) {
        case 'version':
            return version();
        case 'help':
        case 'man':
        case 'manual':
            tmake_core_1.log.log(manual());
            return;
        default:
            return tmake_core_2.readConfigAsync(tmake_core_1.args.configDir || tmake_core_1.args.runDir)
                .then(function (res) {
                if (res) {
                    var projectFile = res;
                    var cmd = tmake_core_1.args._[0];
                    if (!typed_json_transform_1.check(cmd, String)) {
                        tmake_core_1.log.quiet(manual());
                    }
                    switch (tmake_core_1.args._[0]) {
                        case 'example':
                        case 'init':
                            tmake_core_1.log.error("there's already a " + tmake_core_1.args.program + " project file in this directory");
                            return;
                        case 'reset':
                        case 'nuke':
                            tmake_core_2.nuke(path.join(tmake_core_1.args.runDir, 'bin'));
                            tmake_core_2.nuke(path.join(tmake_core_1.args.runDir, 'build'));
                            tmake_core_2.nuke(path.join(tmake_core_1.args.runDir, tmake_core_1.args.cachePath));
                            tmake_core_1.log.quiet("rm -R bin build " + tmake_core_1.args.cachePath);
                            return;
                        default:
                            if (!typed_json_transform_1.check(tmake_core_1.args._[1], parseOptions(cmd).type)) {
                                tmake_core_1.log.quiet(usage(cmd));
                            }
                            if (defaultCommand) {
                                var projectName = tmake_core_1.args._[1] || projectFile.name;
                                tmake_core_1.log.log("tmake all " + projectFile.name);
                            }
                            return tmake(projectFile);
                    }
                }
                switch (tmake_core_1.args._[0]) {
                    case 'init':
                        return initRepo();
                    case 'example':
                        return example_1.example();
                    default:
                        tmake_core_1.log.log(hello());
                }
                return Bluebird.resolve();
            })
                .catch(function (e) {
                try {
                    if (typed_json_transform_1.check(e, tmake_core_1.TMakeError)) {
                        e.postMortem();
                    }
                    else {
                        if (tmake_core_1.args.verbose) {
                            if (typed_json_transform_1.check(e, Error)) {
                                tmake_core_1.log.log('logging node error:');
                                tmake_core_1.log.error(e.stack);
                            }
                        }
                        else {
                            tmake_core_1.log.error(e);
                        }
                    }
                    tmake_core_1.log.log('exit with code:', e.code || 1);
                    process.exit(e.code || 1);
                }
                catch (e) {
                    tmake_core_1.log.log('... inception', e);
                }
            });
    }
}
exports.run = run;
function hello() {
    return "if this is a new project run '" + name + " example' or type '" + name + " help' for more options";
}
exports.hello = hello;
