
import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import * as colors from 'chalk';
import * as path from 'path';
import * as yaml from 'js-yaml';

import { check, contains, extend } from 'typed-json-transform';
import { realpathSync } from 'fs';
import { Project, log, execute, list, unlink, push, Runtime, args, TMakeError } from 'tmake-core';

import { Database } from './db';
import { example } from './example';

import {
  src, dest, nuke,
  readConfigAsync, findConfigAsync,
  writeFileAsync, parseFileSync
} from 'tmake-core';

const name = 'tmake';

export function sortKeysBy(obj: any, comparator?: Function) {
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

export function packageCommand(desc: string): Command {
  return {
    name: 'package',
    type: ['String', 'Undefined'],
    typeName: 'optional string',
    description: desc
  };
}

export function packageCommands(): PackageCommands {
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

export function globalCommands(): GlobalCommands {
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

    init: { description: 'create new tmake project file @ tmake.yaml' },
    help: { description: 'usage guide' },
    report: { description: 'show details of an error report' },
    version: { description: `get current version of ${name}` }
  };
}

export function commands(): Commands {
  return { ...packageCommands(), ...globalCommands() }
}

export function version() {
  const packageInfo: any = parseFileSync(path.join(args.npmDir, 'package.json'));
  const info = _.pick(packageInfo, ['name', 'version', 'homepage', 'author']);
  log.log(info);
}

export function parseOptions(cmd: string) {
  if (!commands()[cmd]) {
    throw new Error(`unknown command ${cmd}`);
  }
  return commands()[cmd];
}

export function usage(cmd: string) {
  const o = parseOptions(cmd);
  return `${colors.gray('usage:')} ${name} ${colors.green(cmd)} ${colors.yellow(o.name)} \n${colors.gray(o.description)}`;
}

export function manual() {
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

export const defaultPackage = {
  name: 'newProject',
  version: '0.0.1',
  outputType: 'executable',
  build: { with: 'cmake' }
};

export function createPackage() {
  return Bluebird.resolve(defaultPackage);
}

export function tmake(rootConfig: TMake.Project.Raw,
  positionalArgs = args._, projectName?: string) {

  const Db = new Database();
  Runtime.init(Db);

  if (!projectName) {
    projectName = positionalArgs[1] || rootConfig.name || Project.resolveName(rootConfig);
  }
  const command = positionalArgs[0]
  switch (command) {
    case 'rm':
      return Db.cleanConfigurations(projectName)
        .then(() => {
          return Db.removeProject(projectName)
        }).then(() => {
          log.quiet(`cleared cache for ${projectName}`)
        });
    case 'unlink':
      return Db.projectNamed(projectName)
        .then((dep: TMake.Project.Cache.File) => unlink(dep || rootConfig));
    case 'ls':
    case 'list':
      return (() => {
        if (positionalArgs[1] === 'local') {
          return list('user', { name: positionalArgs[2] })
        } else if (positionalArgs[1]) {
          return list('cache', { $or: [{ name: positionalArgs[1] }, { project: positionalArgs[1] }] })
        }
        return list('cache', {});
      })().then(nodes => log.log(nodes));
    case 'report':
      return Db.getReports().then((reports) => {
        reports.forEach(report => {
          log.log(report);
        });
      })
    default:
      if (contains(Object.keys(packageCommands()), command)) {
        Runtime.loadPlugins();
        return execute(rootConfig, command, projectName);
      }
      throw new Error(`unknown command ${positionalArgs[0]}`);
  }
}

export function initRepo(): any {
  if (!findConfigAsync(args.runDir)) {
    return createPackage().then(config => {
      return writeFileAsync(`${args.runDir}/tmake.yaml`,
        yaml.dump(config));
    });
  }
  return log.quiet(
    'aborting init, this folder already has a package file present');
}

export function run() {
  let defaultCommand = false;
  if (args._[0] == null) {
    args._[0] = 'all';
    defaultCommand = true;
  }
  if (args.version) {
    return version();
  }
  switch (args._[0]) {
    case 'version':
      return version();
    case 'help':
    case 'man':
    case 'manual':
      log.log(manual());
      return;
    default:
      return readConfigAsync(args.configDir || args.runDir)
        .then(
        (res) => {
          if (res) {
            const projectFile = <TMake.Project.Raw><any>res;
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
                  const projectName = args._[1] || projectFile.name;
                  log.log(`tmake all ${projectFile.name}`)
                }
                return tmake(projectFile);
            }
          }
          switch (args._[0]) {
            case 'init':
              return initRepo();
            case 'example':
              return example();
            default:
              log.log(hello());
          }
          return Bluebird.resolve();
        })
        .catch((e: TMakeError) => {
          try {
            if (check(e, TMakeError)) {
              e.postMortem();
            } else {
              if (args.verbose) {
                if (check(e, Error)) {
                  log.log('logging node error:');
                  log.error(e.stack);
                }
              }
              else {
                log.error(e);
              }
            }
            log.log('exit with code:', (e as any).code || 1);
            process.exit((e as any).code || 1);
          } catch (e) {
            log.log('... inception', e)
          }
        })
  }
}

export function hello() {
  return `if this is a new project run '${name} example' or type '${name} help' for more options`;
}
