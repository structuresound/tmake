import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import { existsSync } from 'fs';
import { arrayify, check, map } from 'typed-json-transform';
import { log } from './log';
import { startsWith } from './string';
import { fetch } from './tools';
import { execAsync } from './sh';
import { args } from './args';
import { Environment } from './environment';
import { Plugin } from './plugin';
import { Compiler } from './compiler';

export function quotedList(array: string[]) {
  return map(array, (el) => {
    return `"${el}"`;
  }).join(' ');
}

export class CMake extends Compiler {
  options: TMake.Plugin.Shell.Compiler.CMake.Options;

  constructor(environment: Environment, options?: TMake.Plugin.Shell.Compiler.CMake.Options) {
    super(environment, options);
    this.name = 'cmake';
    this.projectFileName = 'CMakeLists.txt';
    this.buildFileName = 'build.ninja';
  }

  configureCommand() {
    const defines = this.options.configure.flags || {};
    const cMakeDefines = _.extend({
      LIBRARY_OUTPUT_PATH: this.environment.d.install.libraries[0].from
    }, defines);
    let command = `cmake -G Ninja -DCMAKE_MAKE_PROGRAM=${this.environment.tools.ninja.bin} ${this.environment.d.project}`;
    for (const k of Object.keys(cMakeDefines)) {
      let value = cMakeDefines[k];
      if (check(value, String)) {
        if (startsWith(value, '~/')) {
          value = `${this.environment.d.home}/${value.slice(2)}`;
        }
      }
      command += ` -D${k}=${value}`;
    }
    return command;
  }
  buildCommand(toolpaths?: string) {
    return 'ninja';
  }
  fetch() {
    return fetch(this.options.toolchain).then((toolpaths) => this.toolpaths = toolpaths);
  }
  generate() {
    const header = () => {
      let pv = this.options.cmake ? this.options.cmake.version : '0.0.1';
      if (startsWith(pv, 'v')) {
        pv = pv.slice(1);
      }
      const version = this.options.cmake ? this.options.cmake.minimumVersion : '3.2';
      return `
# generated by trieMake
cmake_minimum_required(VERSION ${version})
project(${this.environment.project.name} VERSION ${pv})`;
    }

    const includeDirectories = () => {
      switch (this.environment.outputType) {
        case 'static':
        case 'dynamic':
        case 'executable':
        default:
          return `
include_directories(${quotedList(this.options.includeDirs)})`;
        case 'environment':
          return `
# Essential include files to build a environment addon,
# you should add this line in every CMake.js based project.
include_directories(\${CMAKE_JS_INC})
include_directories(${quotedList(this.options.includeDirs)})`;
      }
    }

    const matching = () => {
      const relativeToSource = path.relative(this.environment.d.project, this.environment.d.source) || '.';
      const src = _.map(this.environment.s, (fp) => {
        return path.join(relativeToSource, fp);
      })
      return `\n
set(SOURCE_FILES \${SOURCE_FILES} ${quotedList(src)})`;
    }

    const flags = () => {
      const cxxFlags = this.cxxFlags().join(' ');
      return `
set(CMAKE_CXX_FLAGS "\${CMAKE_CXX_FLAGS} ${cxxFlags}")
set(CMAKE_C_FLAGS "\${CMAKE_C_FLAGS} ${this.cFlags().join(' ')}")`;
    }
    const target = () => {
      switch (this.environment.outputType) {
        case 'static':
        default:
          return `\nadd_library(${this.environment.project.name} STATIC \${SOURCE_FILES})`;
        case 'executable':
          return `\nadd_executable(${this.environment.project.name} \${SOURCE_FILES})`;
      }
    }
    const link = () => {
      let linkLibs = quotedList(this.options.libs.reverse());
      const frameworks = quotedList(this.frameworks());
      if (linkLibs.length || frameworks.length) {
        return `
target_link_libraries(\${PROJECT_NAME} ${linkLibs} ${frameworks} ${this.linkerFlags().join(' ')})
`;
      }
      return '';
    }

    const options = this.options;
    return Promise.resolve(
      header() +
      includeDirectories() +
      matching() +
      flags() +
      target() +
      link());
  }
}

export default CMake;