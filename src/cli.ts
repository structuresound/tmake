import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as colors from 'chalk';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { check, contains } from 'js-object-tools';

import { log } from './log';
import { args } from './args';
import {
  src, dest, nuke,
  readConfigAsync, findConfigAsync,
  writeFileAsync, parseFileSync
} from './file';
import { execute, list, unlink, push } from './tmake';
import { cache, user } from './db';
import { graph, createNode } from './graph';

import { ProjectFile, resolveName } from './project';

const name = 'tmake';
Bluebird.onPossiblyUnhandledRejection(function (error) { throw error; });

function sortKeysBy(obj: any, comparator?: Function) {
  const keys = _.sortBy(_.keys(obj), (key) => {
    if (comparator) {
      return comparator(obj[key], key);
    }
    return key;
  });
  const sorted: { [index: string]: Command } = {};
  _.each(keys, key => { sorted[key] = obj[key]; });
  return sorted;
}

const c = { g: colors.green, y: colors.yellow };

interface Command {
  name?: string;
  type?: string[];
  typeName?: string;
  description?: any;
}

interface PackageCommands {
  ls: Command;
  install: Command;
  all: Command;
  fetch: Command;
  configure: Command;
  build: Command;
  push: Command;
  link: Command;
  unlink: Command;
  parse: Command;
  rm: Command;
  test: Command;
  clean: Command;
  graph: Command;
}

interface GlobalCommands {
  [index: string]: Command;

  example: Command;
  init: Command;
  help: Command;
  reset: Command;
  nuke: Command;
  version: Command;
}


interface Commands extends PackageCommands, GlobalCommands {
}

function packageCommand(desc: string): Command {
  return {
    name: 'package',
    type: ['String', 'Undefined'],
    typeName: 'optional string',
    description: desc
  };
}

function packageCommands(): PackageCommands {
  return {
    ls: packageCommand(
      `list state of a ${c.y('package')} from the local ${name} database`),
    install: packageCommand('copy libs and headers to destination'),
    all: packageCommand('fetch, update, build, install'),
    fetch:
    packageCommand(`git / get dependencies for all or ${c.y('package')}`),
    configure: packageCommand(`configure build system ${c.y('package')}`),
    build:
    packageCommand(`build this project or dependency ${c.y('package')}`),
    push: packageCommand(
      `upload the current config file to the ${name} package repository`),
    link: packageCommand(
      `link the current or specified ${c.y('package')} to your local package repository`),
    unlink: packageCommand(
      `remove the current or specified ${c.y('package')} from your local package repository`),
    clean: packageCommand(`clean ${c.y('package')}, or 'all'`),
    parse: packageCommand(`parse project, ${c.y('setting')}, or 'package'`),
    graph: packageCommand(`list dependencies of ${c.y('project')}, or 'all'`),
    rm: packageCommand(`remove file cache, ${c.y('package')}, or 'all'`),
    test: packageCommand(`test this project or dependency ${c.y('package')}`),
  }
}

function globalCommands(): GlobalCommands {
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
    version: { description: `get current version of ${name}` }
  };
}
function commands(): Commands {
  return Object.assign(packageCommands(), globalCommands())
}

function version() {
  const packageInfo: any = parseFileSync(path.join(args.npmDir, 'package.json'));
  const info = _.pick(packageInfo, ['name', 'version', 'homepage', 'author']);
  log.log(info);
}

function parseOptions(cmd: string) {
  if (!commands()[cmd]) {
    throw new Error(`unknown command ${cmd}`);
  }
  return commands()[cmd];
}

function usage(cmd: string) {
  const o = parseOptions(cmd);
  return `${colors.gray('usage:')} ${name} ${colors.green(cmd)} ${colors.yellow(o.name)} \n${colors.gray(o.description)}`;
}

function manual() {
  let man = `
  ${colors.gray('usage:')} ${name} ${colors.green('command')} ${colors.yellow('option')}
  `;
  _.each(sortKeysBy(commands()), (o: any, cmd: string) => {
    if (o.name) {
      man +=
        `           ${colors.green(cmd)} ${colors.yellow(o.name)} ${colors.gray(o.typeName || o.type)}\n`;
    } else {
      man += `           ${colors.green(cmd)}\n`;
    }
    if (check(o.description, Array)) {
      _.each(o.description,
        (d) => { man += colors.gray(`              ${d}\n`); });
    } else {
      man += colors.gray(`              ${o.description}\n`);
    }
  });
  return man;
}

const defaultPackage = {
  name: 'newProject',
  version: '0.0.1',
  outputType: 'executable',
  build: { with: 'cmake' }
};

function createPackage() {
  return Promise.resolve(defaultPackage);
}

function tmake(rootConfig: ProjectFile,
  positionalArgs = args._, projectName?: string) {
  cache.loadDatabase();
  user.loadDatabase();

  if (!projectName) {
    projectName = positionalArgs[1] || rootConfig.name || resolveName(rootConfig);
  }
  const command = positionalArgs[0]
  switch (command) {
    case 'rm':
      return cache.remove({ name: projectName })
        .then(() => {
          return cache.remove({ project: projectName })
        }).then(() => {
          log.quiet(`cleared cache for ${projectName}`)
        });
    case 'unlink':
      return cache.findOne({ name: projectName })
        .then((dep: ProjectFile) => unlink(dep || rootConfig));
    case 'ls':
    case 'list':
      return (() => {
        if (positionalArgs[1] === 'local') {
          return list('user', { name: positionalArgs[2] })
        } else if (positionalArgs[1]) {
          return list('cache', { name: positionalArgs[1] })
        }
        return list('cache', {});
      })().then(nodes => log.log(nodes));
    default:
      if (contains(Object.keys(packageCommands()), command)) {
        return execute(rootConfig, command, projectName);
      }
      throw new Error(`unknown command ${positionalArgs[0]}`);
  }
}

function init(): any {
  if (!findConfigAsync(args.runDir)) {
    return createPackage().then(config => {
      return writeFileAsync(`${args.runDir}/tmake.yaml`,
        yaml.dump(config));
    });
  }
  return log.quiet(
    'aborting init, this folder already has a package file present');
}

function run() {
  let defaultCommand = false;
  if (args._[0] == null) {
    args._[0] = 'all';
    defaultCommand = true;
  }
  if (args.version) {
    return version();
  }
  switch (args._[0]) {
    case 'help':
    case 'man':
    case 'manual':
      log.log(manual());
      return;
    default:
      return readConfigAsync(args.runDir)
        .then(
        (projectFile) => {
          if (projectFile) {
            const cmd = args._[0];
            if (!check(cmd, String)) {
              log.quiet(manual());
            }
            switch (args._[0]) {
              case 'example':
              case 'init':
                log.error(
                  `there's already a ${args.program} project file in this directory`);
                return;
              case 'reset':
              case 'nuke':
                nuke(path.join(args.runDir, 'bin'));
                nuke(path.join(args.runDir, 'build'));
                nuke(path.join(args.runDir, args.cachePath));
                log.quiet(`rm -R bin build ${args.cachePath}`);
                return;
              default:
                if (!check(args._[1], parseOptions(cmd).type)) {
                  log.quiet(usage(cmd));
                }
                if (defaultCommand) {
                  const projectName = args._[1] || projectFile.name || resolveName(projectFile);
                  log.log(`tmake all ${resolveName(projectFile)}`)
                }
                return tmake(projectFile);
            }
          }
          // No config present
          const example = args._[1] || 'served';
          const examplePath =
            path.join(args.npmDir, `examples/${example}`);
          const targetFolder = args._[2] || example;

          switch (args._[0]) {
            case 'init':
              return init();
            case 'example':
              log.quiet(`copy from ${example} to ${targetFolder}`);
              return src(['**/*'], { cwd: examplePath })
                .pipe(dest(path.join(args.runDir, targetFolder)));
            default:
              log.log(hello());
          }
          return Promise.resolve();
        })
        .catch((e: Error) => {
          if (args.verbose) { log.error(e.stack); }
          else {
            log.error(e);
            log.quiet('run with -v (--verbose) for more info');
          }
        });
  }
}

function hello() {
  return `if this is a new project run '${name} example' or type '${name} help' for more options`;
}

export { createPackage, manual, hello, run };
