import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as colors from 'chalk';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {check} from 'js-object-tools';

import log from './util/log';
import args from './util/args';
import * as file from './util/file';
import {execute, list, unlink, push, parse} from './tmake';
import {cache as db} from './db';
import {graph, createNode} from './graph';

import {resolveName} from './node';

const name = 'tmake';
Promise.onPossiblyUnhandledRejection(function(error) { throw error; });

function sortKeysBy(obj: any, comparator?: Function) {
  const keys = _.sortBy(_.keys(obj), (key) => {
    if (comparator) {
      return comparator(obj[key], key);
    }
    return key;
  });
  const sorted: {[index: string]: Command} = {};
  _.each(keys, key => { sorted[key] = obj[key]; });
  return sorted;
}

const c = {g: colors.green, y: colors.yellow};

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
    // clean: packageCommand(`clean project, ${c.y('package')}, or 'all'`),
    reset: {description: 'nuke the cache'},
    nuke: {description: 'nuke the cache'},
    parse: packageCommand(`parse project, ${c.y('setting')}, or 'package'`),
    rm: packageCommand(`remove file cache, ${c.y('package')}, or 'all'`),
    test: packageCommand(`test this project or dependency ${c.y('package')}`),
    init: {description: 'create new tmake project file @ config.cson'},
    help: {description: 'usage guide'}
  };
}

function parseOptions(cmd: string) {
  if (!commands()[cmd]) {
    throw new Error('unknown command');
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
  build: {with: 'cmake'}
};

function createPackage() {
  return Promise.resolve(defaultPackage);
}

function tmake(rootConfig: file.Configuration,
               positionalArgs = args._): Promise<any> {
  const resolvedName =
      positionalArgs[1] || rootConfig.name || resolveName(rootConfig);

  switch (positionalArgs[0]) {
    case 'rm':
      return db.remove({name: resolvedName})
          .then(() => log.quiet(`cleared cache for ${resolvedName}`));
    case 'reset':
    case 'nuke':
      file.nuke(path.join(args.runDir, 'bin'));
      file.nuke(path.join(args.runDir, 'build'));
      file.nuke(path.join(args.runDir, args.cachePath));
      log.quiet(`rm -R bin build ${args.cachePath}`);
    case 'link':
      return execute(rootConfig, 'link');
    case 'unlink':
      return db.findOne({name: resolvedName})
          .then((dep: file.Configuration) => unlink(dep || rootConfig));
    case 'push':
      return execute(rootConfig, 'push');
    case 'test':
      return execute(rootConfig, 'test');
    case 'fetch':
      return execute(rootConfig, 'fetch');
    case 'parse':
      if (positionalArgs[1]) {
        return parse(rootConfig, positionalArgs[1]);
      }
      return parse(rootConfig, 'node');
    case 'configure':
      return execute(rootConfig, 'configure');
    case 'build':
      return execute(rootConfig, 'build');
    case 'install':
      return execute(rootConfig, 'install');
    case 'all':
      return execute(rootConfig, 'install');
    case 'example':
    case 'init':
      log.error(
          `there's already a ${args.program} project file in this directory`);
    case 'ls':
    case 'list':
      return ((): Promise<file.Configuration[] >=> {
               if (positionalArgs[1] === 'local') {
                 return list('user', {name: positionalArgs[2]})
               } else if (positionalArgs[1]) {
                 return list('cache', {name: positionalArgs[1]})
               }
               return list('cache', {});
             })().then(nodes => log.info(nodes));
    default:
      log.quiet(manual());
  }

  return Promise.resolve();
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
  return file.readConfigAsync(args.runDir)
      .then((config) => {
        if (check(config, Error)) {
          throw config;  // as Error
        }
        if (args._[0] == null) {
          args._[0] = 'all';
        }
        if (config) {
          const cmd = args._[0];
          if (!check(cmd, String)) {
            console.log(manual());
            return 1;
          }
          if (!check(args._[1], parseOptions(cmd).type)) {
            console.log(usage(cmd));
            return 2;
          }
          return tmake(config).catch((e: Error) => { log.error(e, e.stack); });
          ;
        }

        // No config present

        const example = args._[1] || 'served';
        const examplePath = path.join(args.npmDir, `examples/${example}`);
        const targetFolder = args._[2] || example;

        switch (args._[0]) {
          case 'init':
            return init();
          case 'example':
            log.quiet(`copy from ${example} to ${targetFolder}`, 'magenta');
            return file.src(['**/*'], {cwd: examplePath})
                .pipe(file.dest(path.join(args.runDir, targetFolder)));
          case 'help':
          case 'man':
          case 'manual':
            console.log(manual());
          default:
            console.log(hello());
        }
      });
}

function hello() {
  return `if this is a new project run '${name} example' or type '${name} help' for more options`;
}

export {createPackage, manual, hello, run};
