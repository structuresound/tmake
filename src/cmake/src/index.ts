/// <reference path="../interfaces/index.d.ts" />

import { join, relative } from 'path';
import { existsSync } from 'fs';
import { arrayify, check, map, extend } from 'typed-json-transform';
import { log, execAsync, execute, startsWith, Tools, Compiler } from 'tmake-core';

export function quotedList(array: string[]) {
  return map(array, (el) => {
    return `"${el}"`;
  }).join(' ');
}

export class CMake extends Compiler {
  options: TMake.Plugin.CMake.Options;

  constructor(configuration: TMake.Configuration, options?: TMake.Plugin.CMake.Options) {
    super(configuration, options);
    this.name = 'cmake';
    this.projectFileName = 'CMakeLists.txt';
    this.buildFileName = 'build.ninja';
  }

  configureCommand() {
    const defines = this.options.defines || {};
    const cMakeDefines = extend({
      LIBRARY_OUTPUT_PATH: this.configuration.parsed.d.install.libraries[0].from
    }, defines);
    let command = `cmake -G Ninja -DCMAKE_MAKE_PROGRAM=${this.configuration.parsed.host.tools.ninja.bin} ${this.configuration.parsed.d.project}`;
    for (const k of Object.keys(cMakeDefines)) {
      let value = cMakeDefines[k];
      if (check(value, String)) {
        if (startsWith(value, '~/')) {
          value = `${this.configuration.parsed.d.home}/${value.slice(2)}`;
        }
      }
      command += ` -D${k}=${value}`;
    }
    return command;
  }
  buildCommand() {
    return this.configuration.parsed.host.tools.ninja.bin;
  }
  fetch() {
    return Tools.fetch(this.options.toolchain || this.configuration.parsed.host.tools).then((toolpaths) => this.toolpaths = toolpaths);
  }
  generate() {
    const header = () => {
      let pv = this.options.version || '0.0.1';
      if (startsWith(pv, 'v')) {
        pv = pv.slice(1);
      }
      const version = this.options.minimumVersion || '3.2';
      return `
# generated by trieMake
cmake_minimum_required(VERSION ${version})
project(${this.configuration.project.parsed.name} VERSION ${pv})`;
    }

    const includeDirectories = () => {
      switch (this.configuration.parsed.outputType) {
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
      const relativeToSource = relative(this.configuration.parsed.d.project, this.configuration.parsed.d.source) || '.';
      const src = map(this.configuration.parsed.s, (fp) => {
        return join(relativeToSource, fp);
      })
      return `\n
set(SOURCE_FILES \${SOURCE_FILES} ${quotedList(src)})`;
    }

    const flags = () => {
      const cxxFlags = this.cppFlags().join(' ');
      return `
set(CMAKE_CXX_FLAGS "\${CMAKE_CXX_FLAGS} ${cxxFlags}")
set(CMAKE_C_FLAGS "\${CMAKE_C_FLAGS} ${this.cFlags().join(' ')}")`;
    }
    const target = () => {
      switch (this.configuration.parsed.outputType) {
        case 'static':
        default:
          return `\nadd_library(${this.configuration.project.parsed.name} STATIC \${SOURCE_FILES})`;
        case 'executable':
          return `\nadd_executable(${this.configuration.project.parsed.name} \${SOURCE_FILES})`;
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

    return header() +
      includeDirectories() +
      matching() +
      flags() +
      target() +
      link();
  }
}

export default CMake;