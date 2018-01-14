declare namespace TMake {
    export namespace Defaults {
        namespace Glob {
            interface Assets {
                images: string[]
                fonts: string[]
            }
        }
        interface Glob {
            assets: Glob.Assets
            fonts: string[]
            headers: string[]
            sources: string[]
        }
    }

    interface Targets {
        [index: string]: TMake.TargetPlatform
    }

    interface Product {
        targets: Targets
        build: Targets
    }

    interface Defaults {
        host?: TMake.HostPlatform
        project?: TMake.Source.Project
        product?: TMake.Product
        target?: TMake.TargetPlatform
    }
}
