declare interface CachePropertyOptions<T> {
    require?: CacheProperty<T>;
    value?: string;
}

declare class CacheProperty<T> {
    require: CacheProperty<T>;
    _value: T;
    _get: Function;
    _combine: Function;
    value(): T;
    set(val: T): void;
    reset(): void;
    update(): T;
    get(): T;
    combine(other: CacheProperty<T>): T;
    dirty(dynamicMatch?: any): boolean;
    constructor(getter: () => T, options?: CachePropertyOptions<T>);
}