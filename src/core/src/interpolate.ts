import { interpolate as _interpolate } from 'js-moss';
import { valueForKeyPath } from 'typed-json-transform';
import { exec } from './shell';

export function interpolate(str: string, dict: any) {
    return _interpolate(str, {
        shell: (string) => exec(string, { silent: true }),
        replace: (sub) => valueForKeyPath(sub, dict)
    }).value;
}
