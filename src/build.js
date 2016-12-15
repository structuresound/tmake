import Promise from 'bluebird';
import path from 'path';
import {check} from 'js-object-tools';

import fs from 'fs';
import {execAsync} from './util/sh';
import profile from './profile';
import {build as cmake} from './cmake';
import {build as ninja} from './ninja';
import {iterate, getCommands} from './iterate';

const ignore = [
  'linkerFlags',
  'cFlags',
  'cxxFlags',
  'compilerFlags',
  'defines',
  'frameworks',
  'sources',
  'headers',
  'libs',
  'includeDirs',
  'outputFile',
  'cache'
];

function buildFolder(node) {
  if (node.build.buildTests) {
    return node.d.test;
  }
  return node.d.build;
}

function buildFile(node) {
  if (node.build.buildTests) {
    return path.join(node.d.project, node.test.buildFile);
  }
  return path.join(node.d.project, node.cache.buildFile);
}

function ensureBuildFolder(node) {
  if (!fs.existsSync(buildFolder(node))) {
    return fs.mkdirSync(buildFolder(node));
  }
}

function ensureBuildFile(node) {
  if (!check(buildFile(node), 'String')) {
    throw new Error('no build file specified');
  }
  if (!fs.existsSync(buildFile(node))) {
    throw new Error(`no build file @ ${buildFile(node)}`);
  }
}

function buildWith(node, system) {
  ensureBuildFolder(node);
  ensureBuildFile(node);
  switch (system) {
    case 'ninja':
      return ninja(node);
    case 'cmake':
      return cmake(node);
    default:
      throw new Error(`bad build system ${system}`);
  }
}

function build(node, isTest) {
  if (!node.build) {
    return Promise.resolve();
  }
  return iterate(getCommands(node.build, ignore), (i) => {
    switch (i.cmd) {
      default:
        throw new Error(`no valid cmd in iterable for ${i.cmd}`);
      case 'ninja':
      case 'cmake':
        return buildWith(node, i.arg);
      case 'with':
        return buildWith(node, i.arg);
      case 'shell':
        return iterate(i.arg, (c) => {
          let lc = check(c, String)
            ? lc = {
              cmd: c
            }
            : c;
          const setting = profile.pathSetting(lc.cwd || node.d.source, node);
          return execAsync(profile.parse(lc.cmd, node), setting, true);
        });
    }
  });
}

export default build;
