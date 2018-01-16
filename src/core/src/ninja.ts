import * as path from 'path';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import {mkdir} from 'shelljs';
import ninja_build_gen = require('ninja-build-gen');
import {arrayify} from 'typed-json-transform';
import {readFileSync, writeFileSync, createWriteStream} from 'fs';
import {log} from './log';
import {Tools} from './tools';
import {execAsync} from './shell';
import {Compiler} from './compiler';
import {Plugin} from './plugin';
import {defaults} from './runtime';


function getRule(ext : string) {
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
  options : TMake.Plugin.Ninja.Options;
  bin: string;
  toolchain: TMake.Tool;
  constructor(configuration : TMake.Configuration, options?) {
    super(configuration, options);
    this.name = 'ninja';
    this.projectFileName = '';
    this.buildFileName = 'build.ninja';

    const { environment } = defaults;
    this.toolchain = (options && options.toolchain) || environment.tools.ninja;
    this.bin = this.toolchain.bin;
    this.version = this.toolchain.version;
  }

  // configureCommand(toolpaths: any) { return '' }
  buildCommand(toolpaths?: string) {
    return this.bin;
  }
  fetch() {
    return Tools
      .fetch(this.toolchain)
      .then((toolpath) => this.toolpath = toolpath);
  }
  generate() {
    return this.configure();
  }
  configure() : PromiseLike < any > {
    let artifacts: {
      libraries?: string[],
      sources?: string[]
    } = {};
    return this
      .sources()
      .then((sources) => {
        artifacts.sources = sources;
        return this.libraries();
      })
      .then((libraries) => {
        artifacts.libraries = libraries;
        const relativeToSource = path.relative(this.configuration.parsed.d.build, this.configuration.parsed.d.source) || '.';
        const ninjaConfig = ninja_build_gen();
        log.verbose('note: this should scan dependencies for their possibly intermediate header insta' +
            'll dirs');
        const includeString = `-I ${this.configuration.parsed.d.root}/trie_modules/include` + _.map(this.options.includeDirs, (dir) => {
          return `-I${dir}`;
        }).join(' ');

        log.add(`ninja:`, this.options);
        const cc = 'gcc';

        const cCommand = `${cc} ${this
          .compilerFlags()
          .join(' ')} -MMD -MF $out.d ${this
          .cFlags()
          .join(' ')} -c $in -o $out ${includeString}`;
        const cppCommand = `${cc} ${this
          .compilerFlags()
          .join(' ')} -MMD -MF $out.d ${this
          .cppFlags()
          .join(' ')} -c $in -o $out ${includeString}`;

        ninjaConfig
          .rule('c')
          .depfile('$out.d')
          .run(cCommand)
          .description(cCommand);

        ninjaConfig
          .rule('cxx')
          .depfile('$out.d')
          .run(cppCommand)
          .description(cppCommand);

        let linkCommand = 'ar rv $out $in';
        let libName = this.options.outputFile;
        artifacts.libraries && log.verbose('    ', 'link:', artifacts.libraries);
        const {name} = this.configuration.project.parsed;
        const {target: {
            output
          }} = this.configuration.parsed;

        switch (output.type) {
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
            const libs = artifacts.libraries
              ? ' ' + artifacts
                .libraries
                .reverse()
                .join(' ')
              : ''
            const flags = this.linkerFlags()
              ? ' ' + this
                .linkerFlags()
                .join(' ')
              : '';
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
          const edge = `${dir}/${name}.o`;
          // log.verbose('+ edge:', edge, 'from:', from);
          ninjaConfig
            .edge(edge)
            .from(from)
            .using(getRule(ext));
          edges.push(edge);
        };

        const linkInput = edges.join(' ');
        ninjaConfig
          .edge(libName)
          .from(linkInput)
          .using('link');

        const fp = this.buildFilePath();
        mkdir('-p', path.dirname(fp));
        const stream = createWriteStream(fp);

        stream.write("####\n");
        stream.write("## trieMake\n");
        stream.write(`## project: ${this.configuration.project.parsed.name}\n`);
        stream.write(`## target: ${this.configuration.parsed.target.architecture}\n`);
        stream.write(`####\n\n`);

        ninjaConfig.saveToStream(stream);

        return new Bluebird((res) => {
          log.add(`  + ${fp}`);
          stream.on('close', res);
          stream.end();
        });

      });
  }
}

export default Ninja;
