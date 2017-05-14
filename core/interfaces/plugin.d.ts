declare namespace TMake {
  class Plugin {
    name: string;
    options: Object;

    public constructor(upstream: any, options?: Object);
    public load(phase: string);
    public fetch(): PromiseLike<any>;
    public generate(): PromiseLike<string>;
    public configure(): PromiseLike<any>;
    public build(): PromiseLike<any>;
    public install(): PromiseLike<any>;
  }

  namespace Plugin {
    type Phase = 'fetch' | 'generate' | 'configure' | 'build' | 'install';

    interface StepOptions {
      environment?: any;
      cmd?: any;
      arguments?: any;
      flags?: any;
    }

    interface Options {
      fetch?: any;
      generate?: StepOptions;
      configure?: StepOptions;
      build?: StepOptions;
      install?: StepOptions;
    }
  }
}

declare module 'tmake-core/plugin' {
  export class Plugin extends TMake.Plugin { }
}