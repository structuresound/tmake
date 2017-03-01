import * as _ from 'lodash';
import * as fs from 'fs';
import { check, extend } from 'js-object-tools';

import * as file from './file';
import { startsWith } from './string';
import { jsonStableHash } from './hash';
import { Project } from './project';

import { defaults } from './defaults';

function jsonToFrameworks(object: any) {
    const flags: string[] = [];
    for (const key of Object.keys(object)) {
        if (object[key]) {
            if (fs.existsSync(`/System/Library/Frameworks/${key}.framework`)) {
                flags.push(`/System/Library/Frameworks/${key}.framework/${key}`);
            } else {
                throw new Error(
                    `can't find framework ${key}.framework in /System/Library/Frameworks`);
            }
        }
    }
    return flags;
}

function _jsonToFlags(object: any, globals: MapToFlagsOptions) {
    const flags: string[] = [];
    _.each(object, (val: any, key: string) => {
        let {prefix} = globals;
        let {join} = globals;
        let rhs = val;
        if (startsWith(key, prefix)) {
            prefix = ''
        }
        if ((typeof rhs === 'string')) {
            if (startsWith(rhs, ' ')) {
                join = '';
            }
            if (startsWith(rhs, '=')) {
                join = '';
            }
        }
        if (typeof rhs === 'boolean') {
            rhs = '';
            join = '';
        }
        flags.push(`${prefix}${key}${join}${rhs}`);
    });
    return flags;
}

interface MapToFlagsOptions { prefix?: string, join?: string }

function jsonToFlags(object: any, options?: MapToFlagsOptions) {
    const defaults = { prefix: '-', join: '=' };
    extend(defaults, options);
    return _jsonToFlags(object, defaults);
}

function jsonToCFlags(object: any) {
    const opt = _.clone(object);
    if (opt.O) {
        switch (opt.O) {
            case 3:
            case '3':
                opt.O3 = true;
                break;
            case 2:
            case '2':
                opt.O2 = true;
                break;
            case 1:
            case '1':
                opt.O1 = true;
                break;
            case 0:
            case '0':
                opt.O0 = true;
                break;
            case 's':
                opt.Os = true;
                break;
            default:
                break;
        }
        delete opt.O;
    }
    if (opt.O3) {
        delete opt.O2;
    }
    if (opt.O3 || opt.O2) {
        delete opt.O1;
    }
    if (opt.O3 || opt.O2 || opt.O1) {
        delete opt.Os;
    }
    if (opt.O3 || opt.O2 || opt.O1 || opt.Os) {
        delete opt.O0;
    }
    return jsonToFlags(opt);
}

export { jsonToFrameworks, jsonToCFlags, jsonToFlags };
