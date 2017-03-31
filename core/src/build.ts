import { each } from 'bluebird';
import { join, relative, dirname } from 'path';
import { arrayify, check } from 'typed-json-transform';

import { execAsync, ensureCommand } from './shell';
import { log } from './log';
import { deps } from './graph';
import { args } from './args';
import { replaceInFile, ReplEntry } from './parse';
import { updateEnvironment } from './db';
import { stringHash } from './hash';
import { iterateOLHM } from './iterate';
import { Runtime } from './runtime';
import { EnvironmentPlugin, Environment } from './environment';
import { Project } from './project';
import { Phase } from './phase';
import { defaults } from './defaults';

export function build(env: Environment, isTest?: boolean): PromiseLike<any> {
    if (env.project.force() || env.cache.build.dirty()) {
        const phase = new Phase(env.build);
        return each(
            phase.commands,
            (i: TMake.CmdObj): PromiseLike<any> => {
                log.verbose(`  ${i.cmd}:`);
                const handler = Runtime.getPlugin(i.cmd);
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