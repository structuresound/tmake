import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as colors from 'chalk';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { check } from 'js-object-tools';

import { log } from './log';
import { args } from './args';
import * as file from './file';
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

interface Commands {
  [index: string]: Command;

  example: Command;
  ls: Command;
  install: Command;
  all: Command;
  fetch: Command;
  configure: Command;
  build: Command;
  push: Command;
  link: Command;
  unlink: Command;
  reset: Command;
  nuke: Command;
  parse: Command;
  rm: Command;
  test: Command;
  init: Command;
  help: Command;
}

function packageCommand(desc: string): Command {
  return {
    name: 'package',
    type: ['String', 'Undefined'],
    typeName: 'optional string',
    description: desc
  };
}

function commands(): Commands {
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
    ls: packageCommand(
      `list state of a ${c.y('package')} from the local ${name} database`),
    // path: packageCommand(
    //     `list local directories for a ${c.y('package')} from the local
    //     ${name} database`),
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
    reset: { description: 'nuke the cache' },
    nuke: { description: 'nuke the cache' },
    parse: packageCommand(`parse project, ${c.y('setting')}, or 'package'`),
    rm: packageCommand(`remove file cache, ${c.y('package')}, or 'all'`),
    test: packageCommand(`test this project or dependency ${c.y('package')}`),
    init: { description: 'create new tmake project file @ config.cson' },
    help: { description: 'usage guide' }
  };
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
  positionalArgs = args._) {
  cache.loadDatabase();
  user.loadDatabase();
  const resolvedName =
    positionalArgs[1] || rootConfig.name || resolveName(rootConfig);

  switch (positionalArgs[0]) {
    case 'rm':
      return cache.remove({ name: resolvedName })
        .then(() => {
          return cache.remove({ project: resolvedName })
        }).then(() => {
          log.quiet(`cleared cache for ${resolvedName}`)
        });
    case 'link':
      return execute(rootConfig, 'link', resolvedName);
    case 'unlink':
      return cache.findOne({ name: resolvedName })
        .then((dep: ProjectFile) => unlink(dep || rootConfig));
    case 'push':
      return execute(rootConfig, 'push', resolvedName);
    case 'test':
      return execute(rootConfig, 'test', resolvedName);
    case 'fetch':
      return execute(rootConfig, 'fetch', resolvedName);
    case 'parse':
      return execute(rootConfig, 'parse', resolvedName);
    case 'clean':
      return execute(rootConfig, 'clean', resolvedName);
    case 'configure':
      return execute(rootConfig, 'configure', resolvedName);
    case 'build':
      return execute(rootConfig, 'build', resolvedName);
    case 'install':
      return execute(rootConfig, 'install', resolvedName);
    case 'all':
      return execute(rootConfig, 'install', resolvedName);
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
      throw new Error(`unknown command ${positionalArgs[0]}`);
  }
}

function init(): any {
  if (!file.findConfigAsync(args.runDir)) {
    return createPackage().then(config => {
      return file.writeFileAsync(`${args.runDir}/tmake.yaml`,
        yaml.dump(config));
    });
  }
  return log.quiet(
    'aborting init, this folder already has a package file present');
}

function run() {
  if (args._[0] == null) {
    args._[0] = 'all';
  }
  switch (args._[0]) {
    case 'help':
    case 'man':
    case 'manual':
      log.log(manual());
      return;
    default:
      return file.readConfigAsync(args.runDir)
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
                file.nuke(path.join(args.runDir, 'bin'));
                file.nuke(path.join(args.runDir, 'build'));
                file.nuke(path.join(args.runDir, args.cachePath));
                log.quiet(`rm -R bin build ${args.cachePath}`);
                return;
              default:
                if (!check(args._[1], parseOptions(cmd).type)) {
                  log.quiet(usage(cmd));
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
              return file.src(['**/*'], { cwd: examplePath })
                .pipe(file.dest(path.join(args.runDir, targetFolder)));
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
