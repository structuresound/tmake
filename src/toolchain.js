import path from 'path';
import sh from 'shelljs';
import Promise from 'bluebird';
import _ from 'lodash';
import fs from 'fs';

import {check} from 'js-object-tools';

import args from './util/args';
import * as file from './util/file';
import log from './util/log';
import {stringHash} from './util/hash';
import {download} from './fetch';
import {startsWith} from './util/string';

// customToolchain =
//   'mac ios':
//     clang:
//       bin: 'bin/clang'
//       include:
//         'libc++': 'include/c++/v1'
//       # libs: ['lib/libc++.']
//       url: 'http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-apple-darwin.tar.xz'
//       signature: 'http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-apple-darwin.tar.xz.sig'
//   linux:
//     gcc:
//       bin: '$(which gcc)'
//       url: 'http://www.netgull.com/gcc/releases/gcc-6.2.0/gcc-6.2.0.tar.gz'
//     clang:
//       bin: 'bin/clang'
//       url: 'http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-linux-gnu-ubuntu-16.04.tar.xz'
//       signature: 'http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-linux-gnu-ubuntu-16.04.tar.xz.sig'

function toolPaths(toolchain) {
  const tools = {};
  _.each(Object.keys(toolchain), name => {
    tools[name] = pathForTool(toolchain[name]);
    return tools[name];
  });
  return tools;
}

function pathForTool(tool) {
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

function fetchAndUnarchive(tool) {
  sanityCheck();
  const rootDir = path.join(args.userCache, 'toolchain', tool.name);
  if (!fs.existsSync(rootDir)) {
    sh.mkdir('-p', rootDir);
  }
  const tempDir = path.join(args.userCache, 'temp', stringHash(tool.url));
  const toolpath = pathForTool(tool);
  return download(tool.url).then((archivePath) => {
    const tooldir = path.join(args.userCache, 'toolchain', tool.name, stringHash(tool.url));
    return file.unarchive(archivePath, tempDir, tooldir, toolpath);
  });
}

function fetchToolchain(toolchain) {
  if (!check(toolchain, Object)) {
    throw new Error('toolchain not object');
  }
  return Promise.each(Object.keys(toolchain), (name) => {
    const tool = toolchain[name];
    const toolpath = pathForTool(tool);
    log.verbose(`checking for tool: ${name} @ ${toolpath}`);
    if (toolpath) {
      return file
        .existsAsync(toolpath)
        .then((exists) => {
          if (exists) {
            log.quiet(`have ${name}`);
            return Promise.resolve(toolpath);
          }
          log.verbose(`fetch ${name} binary from ${tool.url}`);
          return fetchAndUnarchive(tool).then(() => {
            log.quiet(`chmod 755 ${toolpath}`);
            fs.chmodSync(`${toolpath}`, 755);
            return Promise.resolve(toolpath);
          });
        });
    }
  }).then(() => {
    return Promise.resolve(toolPaths(toolchain));
  });
}

export {fetchToolchain as fetch, pathForTool, toolPaths as tools};
