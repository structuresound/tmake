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

    interface Defaults {
        host: TMake.HostPlatform
        tools: TMake.Tools
        flags: TMake.Plugin.Compiler.Flags
        target: TMake.TargetPlatform
        glob: Defaults.Glob
    }
}

