/*global it describe*/
import path from 'path';
import { expect } from 'chai';

import testArgv from './testArgv';

const graph = require('../lib/graph')(testArgv);

import { depA } from './fixtures';
import { depB } from './fixtures';

describe('graph', function() {
  it('source/include', () =>
    graph.resolvePaths(depA)
    .then(resolved => expect(resolved.d.includeDirs[0]).to.equal(path.join(testArgv.runDir, `${testArgv.cachePath}/${depA.name}/source/include`)))
  );

  return it('dynamic includeDirs', () =>
    graph.resolvePaths(depB)
    .then(resolved =>
      expect(resolved.d.includeDirs).to.deep.equal([
        path.join(testArgv.runDir, `${testArgv.cachePath}/${depB.name}/testIncludeDir`),
        path.join(testArgv.runDir, `${testArgv.cachePath}/${depB.name}/another`)
      ])));});
