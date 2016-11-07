import _ from 'lodash';
import Promise from 'bluebird';
import colors from 'chalk';
import {check} from 'js-object-tools';

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

export default {
  parse(argv) {
    const cmd = argv._[0];
    if (!check(cmd, String)) {
      throw manual();
    }
    if (!check(argv._[1], parseOptions(cmd).type)) {
      throw usage(cmd);
    }
  },
  hello() {
    return `if this is a new project run '${name} example' or type '${name} help' for more options`;
  },
  createPackage,
  manual
};
