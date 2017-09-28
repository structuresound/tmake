import * as fs from 'fs';
import * as path from 'path';
import { assert, expect } from 'chai';
import 'mocha';
import { every, check } from 'typed-json-transform';

import { manual, commands } from 'tmake-cli';

describe('manual', () => {
  it('manual', () => {
    const text = manual();
    assert.ok(every(Object.keys(commands()), (cmd) => text.indexOf(cmd) !== -1));
  });
});
