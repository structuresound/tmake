"use strict";
const _ = require("lodash");
const colors = require("chalk");
const path = require("path");
const yaml = require("js-yaml");
const bluebird_1 = require("bluebird");
const typed_json_transform_1 = require("typed-json-transform");
const tmake_core_1 = require("tmake-core");
const args_1 = require("./args");
const example_1 = require("./example");
const tmake_file_1 = require("tmake-file");
const name = 'tmake';
bluebird_1.onPossiblyUnhandledRejection(function (error) { throw error; });
function sortKeysBy(obj, comparator) {
    const keys = _.sortBy(_.keys(obj), (key) => {
        if (comparator) {
            return comparator(obj[key], key);
        }
        return key;
    });
    const sorted = {};
    _.each(keys, key => { sorted[key] = obj[key]; });
    return sorted;
}
const c = { g: colors.green, y: colors.yellow };
function packageCommand(desc) {
    return {
        name: 'package',
        type: ['String', 'Undefined'],
        typeName: 'optional string',
        description: desc
    };
}
function packageCommands() {
    return {
        ls: packageCommand(`list state of a ${c.y('package')} from the local ${name} database`),
        install: packageCommand('copy libs and headers to destination'),
        all: packageCommand('fetch, update, build, install'),
        fetch: packageCommand(`git / get dependencies for all or ${c.y('package')}`),
        configure: packageCommand(`configure build system ${c.y('package')}`),
        build: packageCommand(`build this project or dependency ${c.y('package')}`),
        push: packageCommand(`upload the current config file to the ${name} package repository`),
        link: packageCommand(`link the current or specified ${c.y('package')} to your local package repository`),
        unlink: packageCommand(`remove the current or specified ${c.y('package')} from your local package repository`),
        clean: packageCommand(`clean ${c.y('package')}, or 'all'`),
        parse: packageCommand(`parse project, ${c.y('setting')}, or 'package'`),
        graph: packageCommand(`list dependencies of ${c.y('project')}, or 'all'`),
        rm: packageCommand(`remove file cache, ${c.y('package')}, or 'all'`),
        test: packageCommand(`test this project or dependency ${c.y('package')}`),
    };
}
function globalCommands() {
    return {
        example: {
            name: 'example',
            type: ['String', 'Undefined'],
            typeName: 'optional',
            description: [
                `copy an ${c.y('example')} to the current directory`,
                `the default is a c++11 http server: ${c.y('served')}`
            ]
        },
        reset: { description: 'nuke the cache' },
        nuke: { description: 'nuke the cache' },
        init: { description: 'create new tmake project file @ config.cson' },
        help: { description: 'usage guide' },
        report: { description: 'show details of an error report' },
        version: { description: `get current version of ${name}` }
    };
}
function commands() {
    return Object.assign(packageCommands(), globalCommands());
}
function version() {
    const packageInfo = tmake_file_1.parseFileSync(path.join(args_1.args.npmDir, 'package.json'));
    const info = _.pick(packageInfo, ['name', 'version', 'homepage', 'author']);
    tmake_core_1.log.log(info);
}
function parseOptions(cmd) {
    if (!commands()[cmd]) {
        throw new Error(`unknown command ${cmd}`);
    }
    return commands()[cmd];
}
function usage(cmd) {
    const o = parseOptions(cmd);
    return `${colors.gray('usage:')} ${name} ${colors.green(cmd)} ${colors.yellow(o.name)} \n${colors.gray(o.description)}`;
}
function manual() {
    let man = `
  ${colors.gray('usage:')} ${name} ${colors.green('command')} ${colors.yellow('option')}
  `;
    _.each(sortKeysBy(commands()), (o, cmd) => {
        if (o.name) {
            man +=
                `           ${colors.green(cmd)} ${colors.yellow(o.name)} ${colors.gray(o.typeName || o.type)}\n`;
        }
        else {
            man += `           ${colors.green(cmd)}\n`;
        }
        if (typed_json_transform_1.check(o.description, Array)) {
            _.each(o.description, (d) => { man += colors.gray(`              ${d}\n`); });
        }
        else {
            man += colors.gray(`              ${o.description}\n`);
        }
    });
    return man;
}
exports.manual = manual;
const defaultPackage = {
    name: 'newProject',
    version: '0.0.1',
    outputType: 'executable',
    build: { with: 'cmake' }
};
function createPackage() {
    return Promise.resolve(defaultPackage);
}
exports.createPackage = createPackage;
function tmake(rootConfig, positionalArgs = args_1.args._, projectName) {
    tmake_core_1.db.cache.loadDatabase();
    tmake_core_1.db.user.loadDatabase();
    if (!projectName) {
        projectName = positionalArgs[1] || rootConfig.name;
    }
    const command = positionalArgs[0];
    switch (command) {
        case 'rm':
            return tmake_core_1.db.cache.remove({ name: projectName })
                .then(() => {
                return tmake_core_1.db.cache.remove({ project: projectName });
            }).then(() => {
                tmake_core_1.log.quiet(`cleared cache for ${projectName}`);
            });
        case 'unlink':
            return tmake_core_1.db.cache.findOne({ name: projectName })
                .then((dep) => tmake_core_1.unlink(dep || rootConfig));
        case 'ls':
        case 'list':
            return (() => {
                if (positionalArgs[1] === 'local') {
                    return tmake_core_1.list('user', { name: positionalArgs[2] });
                }
                else if (positionalArgs[1]) {
                    return tmake_core_1.list('cache', { $or: [{ name: positionalArgs[1] }, { project: positionalArgs[1] }] });
                }
                return tmake_core_1.list('cache', {});
            })().then(nodes => tmake_core_1.log.log(nodes));
        case 'report':
            return tmake_core_1.db.cache.findOne({ type: 'report' }).then((report) => {
                // info.report(report);
            });
        default:
            if (typed_json_transform_1.contains(Object.keys(packageCommands()), command)) {
                tmake_core_1.Runtime.loadPlugins();
                return tmake_core_1.execute(rootConfig, command, projectName);
            }
            throw new Error(`unknown command ${positionalArgs[0]}`);
    }
}
function init() {
    if (!tmake_file_1.findConfigAsync(args_1.args.runDir)) {
        return createPackage().then(config => {
            return tmake_file_1.writeFileAsync(`${args_1.args.runDir}/tmake.yaml`, yaml.dump(config));
        });
    }
    return tmake_core_1.log.quiet('aborting init, this folder already has a package file present');
}
function run() {
    let defaultCommand = false;
    if (args_1.args._[0] == null) {
        args_1.args._[0] = 'all';
        defaultCommand = true;
    }
    if (args_1.args.version) {
        return version();
    }
    switch (args_1.args._[0]) {
        case 'version':
            return version();
        case 'help':
        case 'man':
        case 'manual':
            tmake_core_1.log.log(manual());
            return;
        default:
            return tmake_file_1.readConfigAsync(args_1.args.configDir || args_1.args.runDir)
                .then((res) => {
                if (res) {
                    const projectFile = res;
                    const cmd = args_1.args._[0];
                    if (!typed_json_transform_1.check(cmd, String)) {
                        tmake_core_1.log.quiet(manual());
                    }
                    switch (args_1.args._[0]) {
                        case 'example':
                        case 'init':
                            tmake_core_1.log.error(`there's already a ${args_1.args.program} project file in this directory`);
                            return;
                        case 'reset':
                        case 'nuke':
                            tmake_file_1.nuke(path.join(args_1.args.runDir, 'bin'));
                            tmake_file_1.nuke(path.join(args_1.args.runDir, 'build'));
                            tmake_file_1.nuke(path.join(args_1.args.runDir, args_1.args.cachePath));
                            tmake_core_1.log.quiet(`rm -R bin build ${args_1.args.cachePath}`);
                            return;
                        default:
                            if (!typed_json_transform_1.check(args_1.args._[1], parseOptions(cmd).type)) {
                                tmake_core_1.log.quiet(usage(cmd));
                            }
                            if (defaultCommand) {
                                const projectName = args_1.args._[1] || projectFile.name;
                                tmake_core_1.log.log(`tmake all ${projectFile.name}`);
                            }
                            return tmake(projectFile);
                    }
                }
                switch (args_1.args._[0]) {
                    case 'init':
                        return init();
                    case 'example':
                        return example_1.example();
                    default:
                        tmake_core_1.log.log(hello());
                }
                return Promise.resolve();
            })
                .catch((e) => {
                try {
                    if (typed_json_transform_1.check(e, tmake_core_1.TMakeError)) {
                        e.postMortem();
                    }
                    else {
                        if (args_1.args.verbose) {
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
                    tmake_core_1.log.log('... inception');
                }
            });
    }
}
exports.run = run;
function hello() {
    return `if this is a new project run '${name} example' or type '${name} help' for more options`;
}
exports.hello = hello;
