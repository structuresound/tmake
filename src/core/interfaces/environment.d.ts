/// <reference path="trie.d.ts" />

declare namespace TMake {
    type SettingsDictionary = {
        [index : string]: string
    }

    interface Settings {
        keyword : {
            environment: string[],
            host: string[],
            target: string[],
            sdk: string[],
            architecture: string[],
            compiler: string[],
            ide: string[],
            deploy: string[]
        }
        plugin : {
            name: SettingsDictionary
        }
        platform : {
            name: SettingsDictionary
        }
        clang : {
            arch: SettingsDictionary
        }
    }

    interface Defaults {
        target?: TMake.Trie.Target
        environment?: TMake.Trie.Environment,
    }
}
