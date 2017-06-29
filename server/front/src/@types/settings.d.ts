/// <reference path="../interfaces/index.d.ts" />

interface Window {
    __SETTINGS__: Settings
}

interface PrivateSettings {
    createSend: {
        key: string;
    }
    session?: {
        secret: string
    },
    mongo?: {
        uri: string;
    },
    express?: { domain: string, https: boolean, port: number; },
}

interface Settings extends TMake.Settings.Shared.Public {
    createSend: {
        id: string;
        lists: {
            general: string;
        }
    }
    private?: PrivateSettings & TMake.Settings.Shared.Private
    webpack?: {
        dev?: {
            server: {
                domain: string,
                port: number
            }
        },
    }
    ssr?: {
        mq?: TMake.MediaQueryProps
        loginTokenPresent?: boolean
    }
    env: {
        production?: boolean, debug?: {}, isClient?: boolean, isServer?: boolean, absoluteUrl: string
    },
    version: string
}