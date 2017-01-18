/// <reference path="./schema.d.ts" /> 

import * as Promise from 'bluebird';
import * as path from 'path';
import * as fs from 'fs';
import { check } from 'js-object-tools';


import { execAsync } from './util/sh';
import { build as cmake } from './cmake';
import { build as ninja } from './ninja';
import { build as make } from './make';

import { iterate, getCommands } from './iterate';
import { Environment } from './environment';
import { log } from './util/log';

import { getBuildFile, getBuildFilePath } from './configure';

function buildFolder(env: Environment, isTest: boolean) {
  if (isTest) {
    return env.d.test;
  }
  return env.d.build;
}


function ensureBuildFolder(env: Environment, isTest?: boolean) {
  if (!fs.existsSync(buildFolder(env, isTest))) {
    return fs.mkdirSync(buildFolder(env, isTest));
  }
}


function ensureBuildFile(env: Environment, system: string, isTest?: boolean) {
  const buildFilePath = getBuildFilePath(env, system)
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

function build(env: Environment, isTest: boolean) {
  if (!env.build) {
    return Promise.resolve();
  }
  return iterate(getCommands(env.build), (i: schema.CmdObj) => {
    switch (i.cmd) {
      case 'ninja':
      case 'cmake':
      case 'make':
        return buildWith(env, i.arg, isTest);
      case 'with':
        return buildWith(env, i.arg, isTest);
      default:
      case 'shell':
        return iterate(i.arg, (c: schema.CmdObj) => {
          let lc: schema.CmdObj = check(c, String) ? <schema.CmdObj>{ cmd: <any>c } : c;
          const cwd = env.pathSetting(lc.cwd || env.d.source);
          return execAsync(env.parse(lc.cmd, env), { cwd: cwd });
        });
    }
  });
}

export default build;
