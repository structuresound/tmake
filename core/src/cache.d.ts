declare namespace TMake {
  namespace Cache {
    interface Options<T> {
      require?: Property<T>;
      value?: T;
      combine?: () => T;
    }

    class Property<T> {
      require: Property<T>;
      _value: T;
      _get: Function;
      _combine: Function;
      value(): T
      set(val: T): void
      reset(): void
      get(): T
      update(): T
      combine(other: Property<T>): T
      dirty(dynamicMatch?: any): boolean
      constructor(getter: () => T | PromiseLike<T>, options?: Options<T>)
    }

    class Base<T> {
      fetch?: Property<T>;
      generate?: Property<T>;
      configure?: Property<T>;
      build?: Property<T>;
      install?: Property<T>;
    }
  }
}