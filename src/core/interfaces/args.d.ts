declare namespace TMake {
    interface Args {
        runDir?: string;
        binDir?: string;
        npmDir?: string;
        homeDir?: string;
        settingsDir?: string;
        configDir?: string;
        cachePath?: string;
        compiler?: string;
        program?: string;
        verbose?: boolean;
        debug?: boolean;
        dev?: boolean;
        quiet?: boolean;
        noDeps?: boolean;
        version?: boolean;
        f?: string;
        force?: string;
        v?: boolean;
        y?: boolean;
        yes?: boolean;
        test?: boolean;
        _?: string[];
        environment?: any;
    }
}

declare module 'tmake-core/args' {
    const args: TMake.Args;
    namespace Args {
        function init(runtime: TMake.Args): void
        function decode(str): TMake.Args;
        function encode(): string;
    }
}
