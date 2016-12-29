import * as path from 'path';
import * as sh from 'shelljs';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import ninja_build_gen = require('ninja-build-gen');
import log from './util/log';
import {fetch} from './toolchain';
import {Node} from './node';

const ninjaVersion = '1.6.0';

function build(node: Node): Promise<any> {
  return fetch(node.toolchain).then((toolpaths: any) => {
    const directory = node.d.project;
    const command = `${toolpaths.ninja} -C ${directory}`;
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

function generate(node: Node, fileName: string): void {
  log.add('generate new ninja config');
  const ninjaConfig = ninja_build_gen(ninjaVersion, 'build');
  const includeString = _.map(node.configuration.includeDirs, (dir) => {
    return `-I${dir}`;
  }).join(' ');

  const cc = node.configuration.cc || 'gcc';

  const cCommand = `${cc} ${node.configuration
    .compilerFlags()
    .join(' ')} -MMD -MF $out.d ${node.configuration
      .cFlags()
      .join(' ')} -c $in -o $out ${includeString}`;
  const cxxCommand = `${cc} ${node.configuration
    .compilerFlags()
    .join(' ')} -MMD -MF $out.d ${node.configuration
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
  let libName = node.build.outputFile;
  let staticLibs = '';
  switch (node.outputType) {
    case 'static':
    default:
      if (node.name.indexOf('lib') === -1) {
        if (!libName) {
          libName = `lib${node.name}.a`;
        }
      } else if (!libName) {
        libName = `${node.name}.a`;
      }
      linkCommand = 'ar rv $out $in';
      break;
    case 'executable':
      if (!libName) {
        libName = `${node.name}`;
      }
      linkCommand = `${cc} -o $out $in ${node.configuration.libs ? node.configuration.libs.join(' ') : ''} ${node.configuration
        .linkerFlags()
        .join(' ')}`;
      break;
  }

  ninjaConfig
    .rule('link')
    .run(linkCommand)
    .description(linkCommand);

  const linkNames = _.map(node.s, (filePath: string) => {
    // console.log 'process source file', filePath
    const dir = path.dirname(filePath);
    const relative = path.relative(node.p.clone, dir);
    // console.log 'relative from #{node.p.clone} is #{relative}'
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
    .using('link');

  ninjaConfig.save(fileName);
}

export {generate, build};
