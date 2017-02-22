import * as path from 'path';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import ninja_build_gen = require('ninja-build-gen');
import { log } from './log';
import { fetch } from './tools';
import { execAsync } from './sh';

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
    return execAsync(command, { cwd: env.d.build, short: 'ninja' });
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
  const relative = path.relative(env.d.project, env.d.build);
  console.log(`project to build dir = ${relative}`);
  const ninjaConfig = ninja_build_gen(ninjaVersion, relative);
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

  let linkCommand = 'ar rv $out $in';
  let libName = env.build.outputFile;
  let staticLibs = '';
  log.verbose('    ', 'link:', env.project.libs);
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
      linkCommand = 'ar rv $out $in';
      break;
    case 'executable':
      if (!libName) {
        libName = `${env.project.name}`;
      }

      const libs = env.build.libs ? ' ' + env.build.libs.reverse().join(' ') : ''
      const flags = env.linkerFlags() ? ' ' + env.linkerFlags().join(' ') : '';
      linkCommand = `${cc} -o $out $in${libs}${flags}`;
      break;
  }

  ninjaConfig
    .rule('link')
    .run(linkCommand)
    .description(linkCommand);

  const linkNames = [];
  for (const filePath of env.s) {
    // console.log('process source file', filePath);
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    const linkName = `${relative}/${dir}/${name}.o`;
    // console.log('add build file', linkName);
    ninjaConfig
      .edge(linkName)
      .from(filePath)
      .using(getRule(ext));
    linkNames.push(linkName);
  };

  const linkInput = linkNames.join(' ');
  ninjaConfig
    .edge(`${relative}/${libName}`)
    .from(linkInput)
    .using('link');

  ninjaConfig.save(fileName);
  log.add(`  + ${fileName}`);
}

export { generate, build };
