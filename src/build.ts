import { each } from 'bluebird';
import { join, relative, dirname } from 'path';
import { arrayify, check } from 'js-object-tools';

import { execAsync, ensureCommand, ExecOptions } from './sh';
import { log } from './log';
import { deps } from './graph';
import { args } from './args';
import { replaceInFile, ReplEntry } from './parse';
import { updateEnvironment } from './db';
import { stringHash } from './hash';
import { CmdObj, iterateOLHM } from './iterate';
import { Plugin } from './plugin';
import { EnvironmentPlugin, Environment } from './environment';
import { BuildPhase, Project } from './project';
import { defaults } from './defaults';
import { CMakeOptions } from './cmake';

export function build(env: Environment, isTest?: boolean): PromiseLike<any> {
    if (env.project.force() || env.cache.build.dirty()) {
        const commands = env.getBuildIterable();
        return each(
            commands,
            (i: CmdObj): PromiseLike<any> => {
                log.verbose(`  ${i.cmd}:`);
                const handler = Plugin.lookup(i.cmd);
                if (handler) {
                    return env.runPhaseWithPlugin({ phase: 'build', pluginName: i.cmd });
                }
                switch (i.cmd) {
                    case 'shell':
                        return iterateOLHM(i.arg, (command: any) => {
                            return env.sh(command);
                        });
                }
            }).then(() => {
                env.cache.build.update();
                return updateEnvironment(env);
            });
    }
    log.verbose(`configuration is current, use --force=${env.project.name} if you suspect the cache is stale`);
    return Promise.resolve(env);
}