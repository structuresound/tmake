declare namespace schema {
    interface Settings {
        [index: string]: string;
    }

    interface TypedObject<T> {
        [index: string]: T;
    }

    interface Toolchain {
        [index: string]: any;
        host: Platform;
        target: Platform;
        tools: Tools;
        outputType: string;
        path: EnvironmentDirs;
        environment?: any;
        configure?: schema.Configure;
        build?: schema.Build;
    }

    interface CMake {
        defines?: string[];
        version?: any;
    }

    interface Configure {
        create: any;
        replace: any;
        shell: any;
        cmake: any;
        for: any;
    }

    interface Build {
        cFlags: any;
        cxxFlags: any;
        compilerFlags: any;
        linkerFlags: any;
        defines: any;
        frameworks: any;
        sources: any;
        headers: any;
        libs: any;
        includeDirs: any;
        cmake: any;
        outputFile: string;
        with: string;
    }

    interface InstallOptions {
        from: string;
        to?: string;
        sources?: string[];
        includeFrom?: string;
    }

    interface Install {
        binaries?: InstallOptions[];
        headers?: InstallOptions[];
        libs?: InstallOptions[];
        assets?: InstallOptions[];
        libraries?: InstallOptions[];
    }

    interface Git {
        repository?: string;
        url?: string;
        branch?: string;
        tag?: string;
        archive?: string;
    }

    interface Docker {
        user: string,
        image: string,
        architecture: string,
        platform: string,
    }

    interface Platform {
        docker: Docker,
        architecture: string,
        endianness: string,
        compiler: string
        platform: string,
        cpu: { num: number, speed: string }
    }

    interface Tool {
        url: string,
        version: string,
        bin?: string,
        name?: string
    }

    interface Tools {
        ninja: Tool;
        clang: Tool;
    }

    interface CmdObj {
        cmd: string;
        arg?: any;
        cwd?: string;
    }

    interface VinylFile {
        path: string;
        base: string;
        cwd?: string;
    }

    interface CopyOptions {
        followSymlinks?: boolean;
        flatten?: boolean;
        relative?: string;
        from?: string;
        to?: string;
    }

    interface ObjectConstructor {
        name: string;
        getter: Function;
    }

    class Cache {
    }
}