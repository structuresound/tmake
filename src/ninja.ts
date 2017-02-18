import * as path from 'path';
import * as sh from 'shelljs';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import ninja_build_gen = require('ninja-build-gen');
import { log } from './log';
import { fetch } from './tools';

import { Environment } from './environment';

const ninjaVersion = '1.6.0';

function build(env: Environment) {
  return fetch(env.tools).then((toolpaths: any) => {
    const directory = env.d.project;
    let command = '';
    if (env.target.docker) {
      command = `dockcross ninja - C${directory}`;
    } else {
      command = `${toolpaths.ninja} -C ${directory}`;
    }
    log.verbose(command);
    return new Promise((resolve, reject) => {
      sh.exec(command, (code, stdout, stderr) => {
        if (code) {
          return reject(new Error(`ninja exited with code ${code}\n${command}`));
        } else if (stdout) {
          return resolve(stdout);
        } else if (stderr) {
          return resolve(stderr);
        }
      });
    });
  });
}

function getRule(ext: string) {
  switch (ext) {
    case '.cpp':
    case '.cc':
      return 'cxx';
    case '.c':
      return 'c';
    default:
      throw new Error('unknown extension, no coresponding ninja rule');
  }
}

function generate(env: Environment, fileName: string): void {
  log.add('generate new ninja config');
  const ninjaConfig = ninja_build_gen(ninjaVersion, env.d.build);
  const includeString = _.map(env.includeDirs(), (dir) => {
    return `-I${dir}`;
  }).join(' ');

  const cc = 'gcc';

  const cCommand = `${cc} ${env
    .compilerFlags()
    .join(' ')} -MMD -MF $out.d ${env
      .cFlags()
      .join(' ')} -c $in -o $out ${includeString}`;
  const cxxCommand = `${cc} ${env
    .compilerFlags()
    .join(' ')} -MMD -MF $out.d ${env
      .cxxFlags()
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

  let linkCommand = `ar rv ${env.d.build}/$out $in`;
  let libName = env.build.outputFile;
  let staticLibs = '';
  if (env.project.libs) {
    log.verbose('    ', 'link:', env.project.libs);
  }
  switch (env.outputType) {
    case 'static':
    default:
      if (env.project.name.indexOf('lib') === -1) {
        if (!libName) {
          libName = `lib${env.project.name}.a`;
        }
      } else if (!libName) {
        libName = `${env.project.name}.a`;
      }
      linkCommand = `ar rv ${env.d.build}/$out $in`;
      break;
    case 'executable':
      if (!libName) {
        libName = `${env.project.name}`;
      }
      linkCommand = `${cc} -o ${env.d.build}/$out $in${env.build.libs ? ' ' + env.build.libs.join(' ') : ''}${env
        .linkerFlags() ? ' ' + env
          .linkerFlags()
          .join(' ') : ''}`;
      break;
  }

  ninjaConfig
    .rule('link')
    .run(linkCommand)
    .description(linkCommand);

  const linkNames = [];

  for (const filePath of env.s) {
    // console.log('process source file', filePath);
    // const dir = path.dirname(filePath);
    // const relative = path.relative(env.p.clone, dir);
    // console.log(`relative from ${env.p.clone} is ${relative}`);
    // const outBase = path.join('build', relative);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    const linkName = `${env.d.build}/${name}.o`;
    console.log('add build file', linkName);
    ninjaConfig
      .edge(linkName)
      .from(filePath)
      .using(getRule(ext));
    linkNames.push(linkName);
  };

  const linkInput = linkNames.join(' ');
  ninjaConfig
    .edge(libName)
    .from(linkInput)
    .using('link');

  ninjaConfig.save(fileName);
}

export { generate, build };
