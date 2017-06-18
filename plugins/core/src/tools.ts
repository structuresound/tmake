import * as path from 'path';
import { mkdir } from 'shelljs';
import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import * as fs from 'fs';

import { check } from 'typed-json-transform';

import { args } from './runtime';
import * as file from './file';
import { log } from './log';
import { stringHash } from './hash';
import { Fetch } from './fetch';
import { startsWith } from './string';


// customToolchain =
//   'mac ios':
//     clang:
//       bin: 'bin/clang'
//       include:
//         'libc++': 'include/c++/v1'
//       # libs: ['lib/libc++.']
//       url:
//       'http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-apple-darwin.tar.xz'
//       signature:
//       'http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-apple-darwin.tar.xz.sig'
//   linux:
//     gcc:
//       bin: '$(which gcc)'
//       url: 'http://www.netgull.com/gcc/releases/gcc-6.2.0/gcc-6.2.0.tar.gz'
//     clang:
//       bin: 'bin/clang'
//       url:
//       'http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-linux-gnu-ubuntu-16.04.tar.xz'
//       signature:
//       'http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-linux-gnu-ubuntu-16.04.tar.xz.sig'

export namespace Tools {
  export function tools(toolchain: any): TMake.Tools {
    const tools: any = {};
    _.each(Object.keys(toolchain), name => {
      tools[name] = pathForTool(toolchain[name]);
      return tools[name];
    });
    return tools;
  }

  export function pathForTool(tool: any) {
    if (startsWith(tool.bin, '/')) {
      return tool.bin;
    }
    if (!check(tool.name, String)) {
      throw new Error(`tool needs a resolved name, ${tool}`);
    }
    if (!check(tool.bin, String)) {
      throw new Error(`tool needs a resolved bin, ${tool.name}`);
    }
    if (!check(tool.url, String)) {
      throw new Error(`tool needs a resolved url, ${tool.name}`);
    }
    const hash = stringHash(tool.url);
    return path.join(args.homeDir, 'toolchain', tool.name, hash, tool.bin);
  }

  function sanityCheck() {
    if (!args.homeDir) {
      throw new Error('no homeDir specified');
    }
  }

  function fetchAndUnarchive(tool: any) {
    sanityCheck();
    const rootDir = path.join(args.homeDir, 'toolchain', tool.name);
    mkdir('-p', rootDir);
    const tempDir = path.join(args.homeDir, 'temp', stringHash(tool.url));
    const toolpath = pathForTool(tool);
    return Fetch.download(tool.url).then((archivePath) => {
      const tooldir = path.join(args.homeDir, 'toolchain', tool.name, stringHash(tool.url));
      return file.unarchive(archivePath, tempDir, tooldir, toolpath);
    });
  }

  export function fetch(toolchain: any): PromiseLike<TMake.Tools> {
    if (!check(toolchain, Object)) {
      throw new Error('toolchain not object');
    }
    return Bluebird.each(
      Object.keys(toolchain),
      (name) => {
        const tool = toolchain[name];
        const toolpath = pathForTool(tool);
        log.verbose(`checking for tool: ${name} @ ${toolpath}`);
        if (toolpath) {
          const exists = fs.existsSync(toolpath)
          if (exists) {
            log.verbose(`have ${name}`);
            return Bluebird.resolve(toolpath);
          }
          log.verbose(`fetch ${name} binary from ${tool.url}`);
          return fetchAndUnarchive(tool).then(() => {
            log.verbose(`chmod 755 ${toolpath}`);
            fs.chmodSync(`${toolpath}`, 755);
            return Bluebird.resolve(toolpath);
          });
        }
      })
      .then(() => {
        return Bluebird.resolve(tools(toolchain));
      });
  }
}