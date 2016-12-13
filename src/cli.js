import _ from 'lodash';
import Promise from 'bluebird';
import colors from 'chalk';
import path from 'path';
import yaml from 'js-yaml';
import {check} from 'js-object-tools';

import log from './util/log';
import args from './util/args';
import file from './util/file';
import {execute, list, clean, link, unlink, push, parse} from './tmake';
import {cache as db} from './db';
import {graph} from './graph';

const name = 'tmake';

_.mixin({
  sortKeysBy(obj, comparator) {
    const keys = _.sortBy(_.keys(obj), (key) => {
      if (comparator) {
        return comparator(obj[key], key);
      }
      return key;
    });
    return _.object(keys, _.map(keys, key => {
      return obj[key];
    }));
  }
});

const c = {
  g: colors.green,
  y: colors.yellow
};

function packageCommand(desc) {
  return {
    name: 'package',
    type: [
      'String', 'Undefined'
    ],
    typeName: 'optional string',
    description: desc
  };
}

function commands() {
  return {
    example: {
      name: 'example',
      type: [
        'String', 'Undefined'
      ],
      typeName: 'optional',
      description: [
        `copy an ${c.y('example')} to the current directory`,
        `the default is a c++11 http server: ${c.y('served')}`
      ]
    },
    ls: packageCommand(`list state of a ${c.y('package')} from the local ${name} database`),
    path: packageCommand(`list local directories for a ${c.y('package')} from the local ${name} database`),
    install: packageCommand('copy libs and headers to destination'),
    all: packageCommand('fetch, update, build, install'),
    fetch: packageCommand(`git / get dependencies for all or ${c.y('package')}`),
    configure: packageCommand(`configure build system ${c.y('package')}`),
    build: packageCommand(`build this project or dependency ${c.y('package')}`),
    push: packageCommand(`upload the current config file to the ${name} package repository`),
    link: packageCommand(`link the current or specified ${c.y('package')} to your local package repository`),
    unlink: packageCommand(`remove the current or specified ${c.y('package')} from your local package repository`),
    clean: packageCommand(`clean project, ${c.y('package')}, or 'all'`),
    reset: {
      description: 'nuke the cache'
    },
    nuke: {
      description: 'nuke the cache'
    },
    parse: packageCommand(`parse project, ${c.y('setting')}, or 'package'`),
    rm: packageCommand(`remove file cache, ${c.y('package')}, or 'all'`),
    test: packageCommand(`test this project or dependency ${c.y('package')}`),
    init: {
      description: 'create new tmake project file @ config.cson'
    },
    help: {
      description: 'usage guide'
    }
  };
}

function parseOptions(cmd) {
  if (!commands()[cmd]) {
    throw new Error('unknown command');
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
  _.each(_.sortKeysBy(commands()), (o, cmd) => {
    if (o.name) {
      man += `           ${colors.green(cmd)} ${colors.yellow(o.name)} ${colors.gray(o.typeName || o.type)}\n`;
    } else {
      man += `           ${colors.green(cmd)}\n`;
    }
    if (check(o.description, Array)) {
      _.each(o.description, (d) => {
        man += colors.gray(`              ${d}\n`);
      });
    } else {
      man += colors.gray(`              ${o.description}\n`);
    }
  });
  return man;
}

const defaultPackage = {
  name: 'newProject',
  version: '0.0.1',
  target: 'bin',
  build: {
    with: 'cmake'
  }
};

function createPackage() {
  return Promise.resolve(defaultPackage);
}

function tmake(rootConfig, positionalArgs = args._) {
  const resolvedName = positionalArgs[1] || rootConfig.name || graph.resolveDepName(rootConfig);

  switch (positionalArgs[0]) {
    case 'rm':
      return db
        .remove({name: resolvedName})
        .then(() => log.quiet(`cleared cache for ${resolvedName}`));
    case 'clean':
      if (resolvedName === 'all' && rootConfig.deps) {
        return Promise
          .each(rootConfig.deps, dep => clean(dep.name))
          .then(() => clean(rootConfig.name));
      }
      return execute(rootConfig, 'clean', resolvedName);
    case 'reset':
    case 'nuke':
      log.quiet(`nuke cache ${path.join(args.runDir, args.cachePath)}`);
      file.nuke(path.join(args.runDir, args.cachePath));
      file.nuke(path.join(args.runDir, 'bin'));
      file.nuke(path.join(args.runDir, 'build'));
      return log.quiet('post nuke freshness');
    case 'link':
      return db
        .findOne({name: resolvedName})
        .then(dep => link(dep || rootConfig));
    case 'unlink':
      return db
        .findOne({name: resolvedName})
        .then(dep => unlink(dep || rootConfig));
    case 'push':
      return db
        .findOne({name: resolvedName})
        .then(dep => push(dep || rootConfig));
    case 'test':
      return execute(rootConfig, 'test');
    case 'fetch':
      return execute(rootConfig, 'fetch');
    case 'parse':
      return parse(rootConfig);
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
      return log.error(`there's already a ${args.program} project file in this directory`);
    case 'path':
      if (positionalArgs[1]) {
        return db
          .find({name: positionalArgs[1]})
          .then(deps => {
            return log.verbose(_.map(deps, dep => {
              return graph.resolvePaths(dep);
            }));
          });
      }
      break;
    case 'ls':
    case 'list':
      return list();
    default:
      log.quiet(manual());
  }
}

function init() {
  if (!file.findConfigAsync(args.runDir)) {
    return createPackage()
      .then(config => {
        return file.writeFileAync(`${args.runDir}/tmake.yaml`, yaml.dump(config));
      });
  }
  return log.quiet('aborting init, this folder already has a package file present');
}

function run() {
  return file
    .readConfigAsync(args.runDir)
    .then((config) => {
      if (check(config, Error)) {
        throw config;
      }
      if (args._[0] == null) {
        args._[0] = 'all';
      }
      if (config) {
        parseArgs(args);
        return tmake(config);
      }
      const example = args._[1] || 'served';
      const examplePath = path.join(args.npmDir, `examples/${example}`);
      const targetFolder = args._[2] || example;

      switch (args._[0]) {
        case 'init':
          return init();
        case 'example':
          log.quiet(`copy from ${example} to ${targetFolder}`, 'magenta');
          return file.src(['**/*'], {cwd: examplePath}).pipe(file.dest(path.join(args.runDir, targetFolder)));
        case 'help':
        case 'man':
        case 'manual':
          return log.info(manual());
        default:
          return log.info(hello());
      }
    });
}

function parseArgs() {
  const cmd = args._[0];
  if (!check(cmd, String)) {
    throw new Error(manual());
  }
  if (!check(args._[1], parseOptions(cmd).type)) {
    throw new Error(usage(cmd));
  }
}

function hello() {
  return `if this is a new project run '${name} example' or type '${name} help' for more options`;
}

export {createPackage, manual, parseArgs, hello, run};
