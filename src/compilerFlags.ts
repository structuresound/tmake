import * as _ from 'lodash';
import * as fs from 'fs';
import { diff, check } from 'js-object-tools';

import * as file from './util/file';
import { startsWith } from './util/string';
import { jsonStableHash } from './util/hash';
import { getCommands, ignore } from './iterate';
import { Node } from './node';

const stdCxxFlags = {
  O: 2,
  mac: { std: 'c++11', stdlib: 'libc++' },
  linux: { std: 'c++0x', pthread: true }
};

const stdFrameworks = { mac: { CoreFoundation: true } };

const stdLinkerFlags = {
  // static: true
  linux: { 'lstdc++': true, lpthread: true },
  mac: { 'lc++': true }
};


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

function _jsonToFlags(object: any, options: any) {
    const flags: string[] = [];
    _.each(object, (opt: any, key: string) => {
        if (opt) {
            if ((typeof opt === 'string') || check(opt, Number)) {
                let {join} = options;
                if (typeof opt === 'string') {
                    if (startsWith(opt, ' ')) {
                        join = '';
                    }
                    if (startsWith(opt, '=')) {
                        join = '';
                    }
                }
                if (startsWith(key, options.prefix)) {
                    flags.push(`${key}${join}${opt}`);
                } else {
                    flags.push(`${options.prefix}${key}${join}${opt}`);
                }
            } else if (startsWith(key, options.prefix)) {
                flags.push(`${key}`);
            } else {
                flags.push(`${options.prefix}${key}`);
            }
        }
    });
    return flags;
}

function jsonToFlags(object: any, options?: any) {
    const defaultOptions = { prefix: '-', join: '=' };
    if (options) {
        _.extend(defaultOptions, options);
    }
    return _jsonToFlags(object, defaultOptions);
}

const stdCompilerFlags = {
    clang: {
        ios: {
            arch: 'arm64',
            isysroot: '{CROSS_TOP}/SDKs/{CROSS_SDK}',
            'miphoneos-version-min': '={SDK_VERSION}',
            simulator: {
                'mios-simulator-version-min': '=6.1',
                isysroot: '{CROSS_TOP}/SDKs/{CROSS_SDK}'
            }
        }
    }
};

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

export { stdCxxFlags, stdFrameworks, stdLinkerFlags, stdCompilerFlags, jsonToFrameworks, jsonToCFlags, jsonToFlags };
