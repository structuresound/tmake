declare namespace TMake {
    export namespace Defaults {
        namespace Glob {
            interface Assets {
                images : string[],
                fonts : string[]
            }
        }
        interface Glob {
            assets : Glob.Assets,
            fonts : string[],
            headers : string[],
            sources : string[]
        }
    }

    interface Targets {
        [index : string] : TMake.TargetPlatform
    }

    interface Product {
        targets : Targets,
        build : Targets
    }

    interface Environment extends Product {
        host : TMake.HostPlatform,
        tools?: TMake.Tools
    }

    type Dictionary = {
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
            name: Dictionary
        }
        platform : {
            name: Dictionary
        }
        clang : {
            arch: Dictionary
        }
    }

    interface Defaults {
        environment?: TMake.Environment,
        project?: TMake.Source.Project
    }
}
