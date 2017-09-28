import { keyPaths, setValueForKeyPath, each } from 'typed-json-transform';

export const types = {
    request: {
        create: {},
        success: {},
        failure: {}
    },
    editor: {
        update: {
            config: {},
            options: {},
            environment: {},
            result: {}
        }
    }
}

each(keyPaths(types), (kp) => {
    const val = kp.replace(/\./g, '_').toUpperCase();
    setValueForKeyPath(val, kp, types)
})