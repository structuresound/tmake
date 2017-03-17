export class Plugin {
    name: string;
    upstream: Object;
    options: Object;
    public constructor(upstream: any, options?: Object) {
        if (!upstream) {
            throw new Error('no parent context passed to plugin constructor');
        }
        this.upstream = upstream;
        this.options = options || {};
    }
    public load(phase: string) {
    }
    public fetch(): PromiseLike<any> {
        return Promise.resolve();
    }
    public generate(): PromiseLike<string> {
        return Promise.resolve('');
    }
    public configure(): PromiseLike<any> {
        return Promise.resolve();
    }
    public build(): PromiseLike<any> {
        return Promise.resolve();
    }
    public install(): PromiseLike<any> {
        return Promise.resolve();
    }
}