import * as fs from 'fs';
import * as path from 'path';
import { assert, expect } from 'chai';
import { every } from 'typed-json-transform';

import {args} from './index';

describe('test environment', function () {
  it('has a cache path', () => {
    assert.ok(args.cachePath);
  });
});
