import * as Bluebird from 'bluebird';
import * as path from 'path';
import * as fs from 'fs';
import { check } from 'js-object-tools';
import { mkdir } from './sh';

import { execAsync } from './sh';
import { build as cmake } from './cmake';
import { build as ninja } from './ninja';
import { build as make } from './make';

import { CmdObj, iterate, getCommands } from './iterate';
import { Environment } from './environment';
import { log } from './log';

export interface Build {
  with?: string;
  cFlags?: any;
  cxxFlags?: any;
  compilerFlags?: any;
  linkerFlags?: any;
  defines?: any;
  frameworks?: any;
  sources?: any;
  headers?: any;
  libs?: any;
  includeDirs?: any;
  cmake?: any;
  outputFile?: string;
}

function getBuildFolder(env: Environment, isTest: boolean) {
  return isTest ? env.d.test : env.d.build;
}

function ensureBuildFolder(env: Environment, isTest?: boolean) {
  const buildFolder = getBuildFolder(env, isTest);
  if (!fs.existsSync(buildFolder)) {
    mkdir('-p', buildFolder);
  }
}

function ensureBuildFile(env: Environment, system: string, isTest?: boolean) {
  const buildFilePath = env.getBuildFilePath(system);
  if (!check(buildFilePath, 'String')) {
    throw new Error('no build file specified');
  }
  if (!fs.existsSync(buildFilePath)) {
    throw new Error(`no build file @ ${buildFilePath}`);
  }
}

function buildWith(env: Environment, system: string, isTest: boolean) {
  ensureBuildFolder(env, isTest);
  ensureBuildFile(env, system, isTest);
  switch (system) {
    case 'ninja':
      return ninja(env);
    case 'cmake':
      return cmake(env);
    case 'make':
      return make(env);
    default:
      throw new Error(`bad build system ${system}`);
  }
}

export function build(env: Environment, isTest: boolean) {
  if (!env.build) {
    return Promise.resolve();
  }
  return iterate(getCommands(env.build), (i: CmdObj) => {
    switch (i.cmd) {
      case 'ninja':
      case 'cmake':
      case 'make':
        return buildWith(env, i.arg, isTest);
      case 'with':
        return buildWith(env, i.arg, isTest);
      default:
      case 'shell':
        return iterate(i.arg, (c: CmdObj) => {
          let lc: CmdObj = check(c, String) ? <CmdObj>{ cmd: <any>c } : c;
          const cwd = env.pathSetting(lc.cwd || env.project.d.source);
          return execAsync(env.parse(lc.cmd, env), { cwd: cwd });
        });
    }
  });
}
