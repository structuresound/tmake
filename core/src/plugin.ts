import * as Bluebird from 'bluebird';

export class Plugin {
    name: string;
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
    fetch(): PromiseLike<any> {
        return Bluebird.resolve();
    }
    generate(): PromiseLike<any> {
        return Bluebird.resolve('');
    }
    configure(): PromiseLike<any> {
        return Bluebird.resolve();
    }
    build(): PromiseLike<any> {
        return Bluebird.resolve();
    }
    install(): PromiseLike<any> {
        return Bluebird.resolve();
    }
}