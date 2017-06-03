import * as fs from 'fs';
import * as path from 'path';
import { assert, expect } from 'chai';
import { every, check } from 'typed-json-transform';

import { manual, commands } from '../src/cli';

  it('manual', () => {
    const text = manual();
    assert.ok(every(Object.keys(commands()), (cmd) => text.indexOf(cmd) !== -1));
  });