import * as fs from 'fs';
import * as path from 'path';
import { assert, expect } from 'chai';
import { every } from 'typed-json-transform';
import { manual, commands } from '../src';

describe('cli', function () {
  it('manual', () => {
    const text = manual();
    assert.ok(every(Object.keys(commands()), (cmd) => text.indexOf(cmd) !== -1));
  });
});