import { join } from 'path';
import * as fs from 'fs';
import * as Bluebird from 'bluebird';
import { okmap, apply, extend, Mongo } from 'typed-json-transform';
import { log, args } from 'tmake-core';

import { Database } from 'tmake-cli';
import * as Datastore from 'nedb-promise';

export class TestDb extends Database {
    constructor() {
        super();
        this.collections = {
            projects: new Datastore({inMemoryOnly: true}),
            configurations: new Datastore({inMemoryOnly: true}),
            errors: new Datastore({inMemoryOnly: true})
        }
    }
}
