import * as path from 'path';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import { mkdir } from 'shelljs';
import ninja_build_gen = require('ninja-build-gen');
import { arrayify } from 'typed-json-transform';
import { readFileSync } from 'fs';
import { defaults } from './defaults';
import { log } from './log';
import { Tools } from './tools';
import { execAsync } from './shell';
import { Compiler } from './compiler';
import { Plugin } from './plugin';

const ninjaVersion = '1.6.0';

function build(env: TMake.Environment) {
  return Tools.fetch(env.tools).then((toolpaths: any) => {
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

export class Ninja extends Compiler {
  options: TMake.Plugin.Ninja.Options;

  constructor(environment: TMake.Environment) {
    super(environment);
    this.name = 'ninja';
    this.projectFileName = '';
    this.buildFileName = 'build.ninja';
  }

  // configureCommand(toolpaths: any) { return '' }
  buildCommand(toolpaths?: string) {
    return this.environment.tools.ninja.bin;
  }
  fetch() {
    return Tools.fetch(this.options.toolchain || this.environment.tools).then((toolpaths) => this.toolpaths = toolpaths);
  }
  generate() {
    return this.configure();
  }
  configure(): PromiseLike<any> {
    let artifacts: {libraries?: string[], sources?: string[]} = {};
    return this.sources()
      .then((sources) => {
        artifacts.sources = sources;
        return this.libraries();
      })
      .then((libraries) => {
        artifacts.libraries = libraries;
        log.add('generate new ninja config');
        const relativeToBuild = path.relative(this.environment.d.project, this.environment.d.build) || '.';
        const relativeToSource = path.relative(this.environment.d.project, this.environment.d.source) || '.';
        // console.log(`project to build dir = ${relativeToBuild}`);
        const ninjaConfig = ninja_build_gen(ninjaVersion, relativeToBuild);
        log.verbose('note: this should scan dependencies for their possibly intermediate header install dirs');
        const includeString = `-I ${this.environment.d.root}/trie_modules/include` + _.map(this.options.includeDirs, (dir) => {
          return `-I${dir}`;
        }).join(' ');

        // console.log('configure ninja plugin', this.options)
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
        if (artifacts.libraries) {
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
            const libs = artifacts.libraries ? ' ' + artifacts.libraries.reverse().join(' ') : ''
            const flags = this.linkerFlags() ? ' ' + this.linkerFlags().join(' ') : '';
            linkCommand = `${cc} -o $out $in${libs}${flags}`;
            break;
        }

        ninjaConfig
          .rule('link')
          .run(linkCommand)
          .description(linkCommand);

        const edges = [];
        for (const filePath of artifacts.sources) {
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
        mkdir('-p', path.dirname(fp));
        ninjaConfig.save(fp);
        log.add(`  + ${fp}`);
        return Bluebird.resolve(readFileSync(fp, 'utf8'));
      })
  }
}

export default Ninja;