import { EnvironmentPlugin, Environment } from './environment';

function generate(env: Environment, pluginName: string) {
    env.runPhaseWithPlugin({ pluginName, phase: 'generate' })
}