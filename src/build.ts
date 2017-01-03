import * as Promise from 'bluebird';
import * as path from 'path';
import * as fs from 'fs';
import { check } from 'js-object-tools';


import { execAsync } from './util/sh';
import { build as cmake } from './cmake';
import { build as ninja } from './ninja';
import { build as make } from './make';

import { iterate, getCommands, ignore } from './iterate';
import { Node, CmdObj } from './node';
import log from './util/log';

function buildFolder(node: Node, isTest: boolean) {
  if (isTest) {
    return node.d.test;
  }
  return node.d.build;
}

function buildFile(node: Node, isTest: boolean) {
  if (isTest) {
    throw new Error("testing not supported yet");
    // return path.join(node.d.project, node.test.buildFile);
  }
  if (!node.cache.buildFile) {
    log.throw('node.cache.buildFile not set yet', node.cache);
  }
  return path.join(node.d.project, node.cache.buildFile);
}

function ensureBuildFolder(node: Node, isTest?: boolean) {
  if (!fs.existsSync(buildFolder(node, isTest))) {
    return fs.mkdirSync(buildFolder(node, isTest));
  }
}


function ensureBuildFile(node: Node, isTest?: boolean) {
  if (!check(buildFile(node, isTest), 'String')) {
    throw new Error('no build file specified');
  }
  if (!fs.existsSync(buildFile(node, isTest))) {
    throw new Error(`no build file @ ${buildFile(node, isTest)}`);
  }
}

function buildWith(node: Node, system: string, isTest: boolean) {
  ensureBuildFolder(node);
  ensureBuildFile(node);
  switch (system) {
    case 'ninja':
      return ninja(node);
    case 'cmake':
      return cmake(node);
    case 'make':
      return make(node);
    default:
      throw new Error(`bad build system ${system}`);
  }
}

function build(node: Node, isTest: boolean) {
  if (!node.build) {
    return Promise.resolve();
  }
  return iterate(getCommands(node.build, ignore), (i: CmdObj) => {
    switch (i.cmd) {
      case 'ninja':
      case 'cmake':
      case 'make':
        return buildWith(node, i.arg, isTest);
      case 'with':
        return buildWith(node, i.arg, isTest);
      default:
      case 'shell':
        return iterate(i.arg, (c: CmdObj) => {
          let lc: CmdObj = check(c, String) ? <CmdObj>{ cmd: <any>c } : c;
          const cwd = node.pathSetting(lc.cwd || node.d.source);
          return execAsync(node.parse(lc.cmd, node), { cwd: cwd });
        });
    }
  });
}

export default build;
