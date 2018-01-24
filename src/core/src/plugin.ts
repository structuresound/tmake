import * as Bluebird from 'bluebird';

export class Plugin {
    name: string;
    version: string;
    upstream: Object;
    options: Object;
    constructor(upstream: any, options?: Object) {
        if (!upstream) {
            throw new Error('no parent context passed to plugin constructor');
        }
        this.upstream = upstream;
        this.options = options || {};
    }
    load(phase: string) {
    }
    fetch(): any {
        return Bluebird.resolve();
    }
    generate(): any {
        return Bluebird.resolve('');
    }
    configure(): any {
        return Bluebird.resolve();
    }
    build(): any {
        return Bluebird.resolve();
    }
    install(): any {
        return Bluebird.resolve();
    }
    test(): any {
        return Bluebird.resolve();
    }
}
