import { jsonStableHash, stringHash } from './hash';

export class Property<T> {
    require: Property<T>;
    _value: T;
    _get: Function;
    _combine: Function;
    value(): T {
        return this._value;
    }
    set(val: T): void {
        this._value = val;
    }
    reset(): void {
        this._value = undefined;
    }
    get(): T {
        if (this.require) {
            return this.combine(this.require);
        }
        return this._get();
    }
    update(): T {
        const ret = this.get();
        this.set(ret);
        return ret;
    }
    combine(other: Property<T>): T {
        if (this._combine) {
            return this._combine(this, other);
        }
        return <any>stringHash(<any>this._get() + <any>other.value());
    }
    dirty(dynamicMatch?: any): boolean {
        let existing = dynamicMatch ? dynamicMatch : this.get();
        if (this._value && this._value === existing) {
            return false;
        }
        return true;
    }
    constructor(getter: () => T | Promise<T>, options?: TMake.Cache.Options<T>) {
        this._get = getter;
        if (options) {
            this._combine = options.combine;
            this._value = options.value;
            this.require = options.require;
        }
    }
}

export class Cache<T> {
    fetch?: Property<T>;
    generate?: Property<T>;
    configure?: Property<T>;
    build?: Property<T>;
    install?: Property<T>;
}