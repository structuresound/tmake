declare namespace TMake {
    interface Args {
        runDir: string;
        npmDir: string;
        binDir: string;
        settingsDir: string;
        configDir: string;
        cachePath: string;
        compiler: string;
        program: string;
        verbose: boolean;
        debug: boolean;
        dev: boolean;
        quiet: boolean;
        noDeps: boolean;
        version: boolean;
        f: string;
        force: string;
        v: boolean;
        y: boolean;
        yes: boolean;
        test: boolean;
        userCache: string;
        _: string[];
        environment: any;
    }
}