import * as path from 'path';
import * as sh from 'shelljs';
import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import * as fs from 'fs';

import { check } from 'js-object-tools';

import { args } from './args';
import * as file from './file';
import { log } from './log';
import { stringHash } from './hash';
import { download } from './fetch';
import { startsWith } from './string';

export interface Tool {
  url: string,
  version: string,
  bin?: string,
  name?: string
}

export interface Tools {
  ninja?: Tool;
  clang?: Tool;
}

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

function toolPaths(toolchain: any) {
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
  return path.join(args.userCache, 'toolchain', tool.name, hash, tool.bin);
}

function sanityCheck() {
  if (!args.userCache) {
    throw new Error('no userCache specified');
  }
}

function fetchAndUnarchive(tool: any) {
  sanityCheck();
  const rootDir = path.join(args.userCache, 'toolchain', tool.name);
  if (!fs.existsSync(rootDir)) {
    sh.mkdir('-p', rootDir);
  }
  const tempDir = path.join(args.userCache, 'temp', stringHash(tool.url));
  const toolpath = pathForTool(tool);
  return download(tool.url).then((archivePath) => {
    const tooldir =
      path.join(args.userCache, 'toolchain', tool.name, stringHash(tool.url));
    return file.unarchive(archivePath, tempDir, tooldir, toolpath);
  });
}

function fetchToolchain(toolchain: any) {
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
        return file.existsAsync(toolpath).then((exists) => {
          if (exists) {
            log.verbose(`have ${name}`);
            return Promise.resolve(toolpath);
          }
          log.verbose(`fetch ${name} binary from ${tool.url}`);
          return fetchAndUnarchive(tool).then(() => {
            log.verbose(`chmod 755 ${toolpath}`);
            fs.chmodSync(`${toolpath}`, 755);
            return Promise.resolve(toolpath);
          });
        });
      }
    })
    .then(() => { return Promise.resolve(toolPaths(toolchain)); });
  ;
}

export { fetchToolchain as fetch, toolPaths as tools };
