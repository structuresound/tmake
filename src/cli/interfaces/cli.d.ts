declare interface Command {
    name?: string;
    type?: string[];
    typeName?: string;
    description?: any;
}

declare interface PackageCommands {
    ls: Command;
    install: Command;
    all: Command;
    fetch: Command;
    configure: Command;
    build: Command;
    push: Command;
    link: Command;
    unlink: Command;
    parse: Command;
    rm: Command;
    test: Command;
    clean: Command;
    graph: Command;
}

declare interface GlobalCommands {
    [index: string]: Command;

    example: Command;
    init: Command;
    help: Command;
    reset: Command;
    nuke: Command;
    version: Command;
}


declare interface Commands extends PackageCommands, GlobalCommands {
}

declare module 'tmake-cli/cli' {
    export function manual(): string;
    export function commands(): Commands;
}
