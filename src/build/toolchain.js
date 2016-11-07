import path from 'path';
import sh from 'shelljs';
import Promise from 'bluebird';
import _ from 'lodash';
import {check} from 'js-object-tools';

import fs from '../util/fs';
import log from '../util/log';
import {stringHash} from '../util/hash';
import fetch from '../util/fetch';
import profile from '../profile';
import {startsWith} from '../util/string';

const stdToolchain = {
  'mac ios': {
    clang: {
      bin: '$(which gcc)'
    }
  },
  linux: {
    gcc: {
      bin: '$(which gcc)'
    }
  }
};

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

function sanityCheck() {
  if (!argv.userCache) {
    throw new Error('no userCache specified');
  }
}

function fetchAndUnarchive(tool) {
  sanityCheck();
  const rootDir = path.join(argv.userCache, 'toolchain', tool.name);
  if (!fs.existsSync(rootDir)) {
    sh.mkdir('-p', rootDir);
  }
  const tempDir = path.join(argv.userCache, 'temp', stringHash(tool.url));
  const toolpath = pathForTool(tool);
  return fetch(tool.url).then(function(archivePath) {
    const tooldir = path.join(argv.userCache, 'toolchain', tool.name, stringHash(tool.url));
    return fs.unarchive(archivePath, tempDir, tooldir, toolpath);
  });
}

const buildSystems = ['cmake', 'ninja'];
const compilers = ['clang', 'gcc', 'msvc'];

function toolPaths(toolchain) {
  const tools = {};
  _.each(Object.keys(toolchain), name => tools[name] = pathForTool(toolchain[name]));
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
  return path.join(argv.userCache, 'toolchain', tool.name, hash, tool.bin);
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
      return fs
        .existsAsync(toolpath)
        .then((exists) => {
          if (exists) {
            log.quiet(`found ${name}`);
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
  });
}

function select(toolchain) {
  const selected = profile.select((toolchain || stdToolchain), {
    ignore: buildSystems.concat(compilers)
  });
  _.each(selected, (tool, name) => {
    if (tool.bin == null) {
      tool.bin = name;
    }
    return tool.name != null
      ? tool.name
      : (tool.name = name);
  });
  return selected;
}

export default {
  pathForTool,
  fetch : fetchToolchain,
  tools(toolchain) {
    return toolPaths(toolchain);
  },
  select
};
