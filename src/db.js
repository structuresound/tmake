import Datastore from 'nedb-promise';
import path from 'path';
import fs from 'fs';

import args from './util/args';
import log from './util/log';
import {mkdir} from './util/sh';

let cachePath;

if (process.env.NODE_ENV === 'test' || process.env.LOADED_MOCHA_OPTS) {
    cachePath = path.join(args.userCache, 'cache.db');
    if (fs.existsSync(cachePath)){
        fs.unlinkSync(cachePath);
    };
} else {
    const cacheDir = path.join(args.runDir, args.cachePath);
    cachePath = path.join(cacheDir, 'cache.db');
}


const cache = new Datastore({filename: cachePath, autoload: true});

const localDb = `${args.userCache}/packages.db`
const localRepo = new Datastore({filename: localDb, autoload: true});

export {cache, localRepo};
