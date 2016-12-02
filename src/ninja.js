import path from 'path';
import sh from 'shelljs';
import _ from 'lodash';
import Promise from 'bluebird';
import nbg from 'ninja-build-gen';
import log from './util/log';
import toolchain from './toolchain';
// fs = require('../util/fs')
// colors = require ('chalk')
const ninjaVersion = '1.6.0';

function getNinja() {
  const resolved = toolchain.select({
    ninja: {
      version: ninjaVersion,
      url: ' https: //github.com/ninja-build/ninja/releases/download/v{ninja.version}/ninja-{HOST_PLATFORM}.zip'
    }
  });
  return toolchain
    .fetch(resolved)
    .then(() => {
      return Promise.resolve(toolchain.pathForTool(resolved.ninja));
    });
}

function verifyToolchain(dep) {
  return toolchain.fetch(dep.configuration.hostToolchain);
}

function getRule(ext) {
  switch (ext) {
    case '.cpp ':
    case '.cc ':
      return ' cxx ';
    case '.c ':
      return ' c ';
    default:
      throw new Error('unknown extension, no coresponding ninja rule');
  }
}

function build(dep) {
  return verifyToolchain(dep).then(() => {
    return getNinja(dep);
  }).then((ninjaPath) => {
    const directory = dep.d.project;
    const command = `${ninjaPath} -C ${directory}`;
    log.verbose(command);
    return new Promise((resolve, reject) => {
      sh.exec(command, (code, stdout, stderr) => {
        if (code) {
          return reject(`ninja exited with code ${code}\n${command}`);
        } else if (stdout) {
          return resolve(stdout);
        } else if (stderr) {
          return resolve(stderr);
        }
      });
    });
  });
}

function generate(dep, fileName) {
  const context = dep.configuration;
  const ninjaConfig = nbg(ninjaVersion, 'build');
  const includeString = ` -I${context
    .includeDirs
    .join(' - I ')}`;

  const cc = context.cc || ' gcc ';

  const cCommand = `${cc} ${context
    .compilerFlags
    .join(' ')} -MMD -MF $out.d ${context
    .cFlags
    .join(' ')} -c $in -o $out ${includeString}`;
  const cxxCommand = `${cc} ${context
    .compilerFlags
    .join(' ')} -MMD -MF $out.d ${context
    .cxxFlags
    .join(' ')} -c $in -o $out ${includeString}`;

  ninjaConfig
    .rule('c')
    .depfile('$out.d')
    .run(cCommand)
    .description(cCommand);

  ninjaConfig
    .rule('cxx')
    .depfile('$out.d')
    .run(cxxCommand)
    .description(cxxCommand);

  let linkCommand = ' ar rv $out $in ';
  let libName = dep.build.outputFile;
  let staticLibs = '';
  switch (context.target) {
    case 'static':
    default:
      if (dep.name.indexOf('lib') === -1) {
        if (typeof libName === 'undefined' || libName === null) {
          libName = `lib${dep.name}.a`;
        }
      } else if (typeof libName === 'undefined' || libName === null) {
        libName = `${dep.name}.a`;
      }
      linkCommand = 'ar rv $out $in';
      break;
    case 'bin':
      if (typeof libName === 'undefined' || libName === null) {
        libName = `${dep.name}`;
      }
      if (context.libs) {
        staticLibs = context
          .libs
          .join(' ');
      }
      linkCommand = `${cc} -o $out $in ${staticLibs} ${context
        .linkerFlags
        .join(' ')}`;
      break;
  }

  ninjaConfig
    .rule('link')
    .run(linkCommand)
    .description(linkCommand);

  const linkNames = _.map(context.sources, (filePath) => {
    // console.log 'process source file', filePath
    const dir = path.dirname(filePath);
    const relative = path.relative(dep.p.clone, dir);
    // console.log 'relative from #{dep.p.clone} is #{relative}'
    const outBase = path.join('build', relative);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    const linkName = `${outBase}/${name}.o`;
    // console.log 'add build file', linkName
    ninjaConfig
      .edge(linkName)
      .from(filePath)
      .using(getRule(ext));
    return linkName;
  });

  const linkInput = linkNames.join(' ');
  ninjaConfig
    .edge(`build/${libName}`)
    .from(linkInput)
    .using(' link ');

  return ninjaConfig.save(fileName);
}

export default {
  generate,
  build,
  getNinja
};
