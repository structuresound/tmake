import _ from 'underscore';
import Promise from 'bluebird';
import colors from 'chalk';
import check from './util/check';

_.mixin({
  ['sortKeysBy'](obj, comparator) {
    const keys = _.sortBy(_.keys(obj), function(key) {
      if (comparator) {
        return comparator(obj[key], key);
      } else {
        return key;
      }
    });
    return _.object(keys, _.map(keys, key => obj[key]));
  }
});

const c = {
  g: colors.green,
  y: colors.yellow
};

const commands = function() {
  const packageCommand = desc => ({
    name: 'package',
    type: [
      'String', 'Undefined'
    ],
    typeName: 'optional string',
    description: desc
  });
  return {
    example: {
      name: 'example',
      type: [
        'String', 'Undefined'
      ],
      typeName: 'optional',
      description: [`copy an ${c.y('example')} to the current directory`, `the default is a c++11 http server: ${c.y('served')}`]
    },
    ls: packageCommand(`list state of a ${c.y('package')} from the local ${p} database`),
    path: packageCommand(`list local directories for a ${c.y('package')} from the local ${p} database`),
    install: packageCommand('copy libs and headers to destination'),
    all: packageCommand('fetch, update, build, install'),
    fetch: packageCommand(`git / get dependencies for all or ${c.y('package')}`),
    configure: packageCommand(`configure build system ${c.y('package')}`),
    build: packageCommand(`build this project or dependency ${c.y('package')}`),
    push: packageCommand(`upload the current config file to the ${p} package repository`),
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
};

const parseOptions = function(cmd) {
  if (!commands()[cmd]) {
    throw 'unknown command';
  }
  return commands()[cmd];
};

const usage = function(cmd) {
  const o = parseOptions(cmd);
  return `${colors.gray('usage:')} ${p} ${colors.green(cmd)} ${colors.yellow(o.name)} \n${colors.gray(o.description)}`;
};

const manual = function() {
  const man = `
${colors.gray('usage:')} ${p} ${colors.green('command')} ${colors.yellow('option')}
`;
  _.each(_.sortKeysBy(commands()), function(o, cmd) {
    if (o.name) {
      man += `           ${colors.green(cmd)} ${colors.yellow(o.name)} ${colors.gray(o.typeName || o.type)}\n`;
    } else {
      man += `           ${colors.green(cmd)}\n`;
    }
    if (check(o.description, Array)) {
      return _.each(o.description, d => man += colors.gray(`              ${d}\n`));
    } else {
      return man += colors.gray(`              ${o.description}\n`);
    }
  });
  return man;
};

const defaultPackage = {
  name: 'newProject',
  version: '0.0.1',
  target: 'bin',
  build: {
    with: 'cmake'
  }
};

const createPackage = () => new Promise(resolve => resolve(defaultPackage));

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
    return `if this is a new project run '${p} example' or type '${p} help' for more options`;
  },
  createPackage,
  manual
};
