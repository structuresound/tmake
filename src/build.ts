import * as Bluebird from 'bluebird';
import * as path from 'path';
import * as fs from 'fs';
import { check } from 'js-object-tools';
import { mkdir } from './sh';

import { execAsync, ensureCommand } from './sh';
import { build as cmake } from './cmake';
import { build as ninja } from './ninja';
import { build as make } from './make';
import { errors } from './errors';

import { CmdObj, iterate, getCommands } from './iterate';
import { Environment } from './environment';
import { args } from './args';
import { log } from './log';
import { encode as encodeArgs } from './args';

export interface Build {
  with?: string;
  cFlags?: any;
  cxxFlags?: any;
  compilerFlags?: any;
  linkerFlags?: any;
  defines?: any;
  arguments?: any;
  prefix?: any;
  shell?: any;
  frameworks?: any;
  matching?: any;
  headers?: any;
  libs?: any;
  includeDirs?: any;
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

export function ensureBuildFile(env: Environment, system: string, isTest?: boolean) {
  const buildFilePath = env.getProjectFilePath(system);
  if (!check(buildFilePath, 'String')) {
    throw new Error('no build file specified');
  }
  if (!fs.existsSync(buildFilePath)) {
    errors.build.noBuildFile(env, system);
  }
}

function buildWith(env: Environment, system: string, isTest: boolean) {
  if (system == 'tmake') {
    args.configDir = env.project.d.clone;
    return execAsync(`TMAKE_ARGS="${encodeArgs()}" tmake`, { cwd: env.project.d.source, short: 'tmake' });
  }
  ensureBuildFolder(env, isTest);
  switch (system) {
    case 'ninja':
      return ninja(env);
    case 'cmake':
      ensureCommand(system);
      return cmake(env);
    case 'make':
      ensureCommand(system);
      return make(env);
    default:
      throw new Error(`bad build system ${system}`);
  }
}

function buildCommand(c: any, env: Environment) {
  let lc: CmdObj = check(c, String) ? <CmdObj>{ cmd: <any>c } : c;
  const cwd = env.pathSetting(lc.cwd || env.project.d.source);
  if (lc.cwd) {
    log.verbose(`  cwd: ${lc.cwd}`);
  }
  return execAsync(env.parse(lc.cmd), { cwd: cwd });
}

export function build(env: Environment, isTest: boolean) {
  if (!env.build) {
    console.log('no build for environment');
    return Promise.resolve();
  }
  return iterate(getCommands(env.build), (i: CmdObj) => {
    switch (i.cmd) {
      case 'with':
        return buildWith(env, i.arg, isTest);
      default:
        return buildCommand(i.arg, env);
      case 'shell':
        return iterate(i.arg, (c: CmdObj) => {
          return buildCommand(c, env);
        });
    }
  })
}
