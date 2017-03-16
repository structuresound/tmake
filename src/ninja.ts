import * as path from 'path';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import ninja_build_gen = require('ninja-build-gen');
import { readFileSync } from 'fs';

import { log } from './log';
import { fetch } from './tools';
import { execAsync } from './sh';
import { Compiler, CompilerOptions } from './compiler';
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

export interface NinjaOptions extends CompilerOptions {
  cmake: {
    minimumVersion: string;
    version: string;
  },
  toolchain?: {
    ninja?: {
      version?: string;
    }
  }
}


export class Ninja extends Compiler {
  options: NinjaOptions;

  constructor(environment: Environment) {
    super(environment);
    this.name = 'ninja';
    this.projectFileName = '';
    this.buildFileName = 'build.ninja';

    this.init();
  }

  configureCommand(toolpaths: any) { return '' }
  buildCommand(toolpaths?: string) {
    return 'ninja';
  }
  fetch() {
    return fetch(this.options.toolchain).then((toolpaths) => this.toolpaths = toolpaths);
  }
  generate() {
    log.add('generate new ninja config');
    const relativeToBuild = path.relative(this.environment.d.project, this.environment.d.build) || '.';
    const relativeToSource = path.relative(this.environment.d.project, this.environment.d.source) || '.';
    console.log(`project to build dir = ${relativeToBuild}`);
    const ninjaConfig = ninja_build_gen(ninjaVersion, relativeToBuild);
    const includeString = _.map(this.environment.includeDirs(), (dir) => {
      return `-I${dir}`;
    }).join(' ');

    const cc = 'gcc';

    const cCommand = `${cc} ${this
      .compilerFlags()
      .join(' ')} -MMD -MF $out.d ${this
        .cFlags()
        .join(' ')} -c $in -o $out ${includeString}`;
    const cxxCommand = `${cc} ${this
      .compilerFlags()
      .join(' ')} -MMD -MF $out.d ${this
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
    let libName = this.options.outputFile;
    let staticLibs = '';
    if (this.libs) {
      log.verbose('    ', 'link:', this.libs);
    }
    const name = this.environment.project.name;
    switch (this.environment.outputType) {
      case 'static':
      default:
        if (name.indexOf('lib') === -1) {
          if (!libName) {
            libName = `lib${name}.a`;
          }
        } else if (!libName) {
          libName = `${name}.a`;
        }
        linkCommand = 'ar rv $out $in';
        break;
      case 'executable':
        if (!libName) {
          libName = name;
        }
        const libs = this.libs ? ' ' + this.libs.reverse().join(' ') : ''
        const flags = this.linkerFlags() ? ' ' + this.linkerFlags().join(' ') : '';
        linkCommand = `${cc} -o $out $in${libs}${flags}`;
        break;
    }

    ninjaConfig
      .rule('link')
      .run(linkCommand)
      .description(linkCommand);

    const edges = [];
    for (const filePath of this.environment.s) {
      const dir = path.dirname(filePath);
      const ext = path.extname(filePath);
      const name = path.basename(filePath, ext);
      const from = path.join(relativeToSource, filePath);
      const edge = path.join(relativeToBuild, `${dir}/${name}.o`);
      log.verbose('+ edge:', edge, 'from:', from);
      ninjaConfig
        .edge(edge)
        .from(from)
        .using(getRule(ext));
      edges.push(edge);
    };

    const linkInput = edges.join(' ');
    ninjaConfig
      .edge(path.join(relativeToBuild, libName))
      .from(linkInput)
      .using('link');

    const fp = this.buildFilePath();
    ninjaConfig.save(fp + '_node');
    log.add(`  + ${fp}`);
    return Promise.resolve(readFileSync(fp + '_node', 'utf8'));
  }
}
