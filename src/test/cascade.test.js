/*globals describe it*/

import { expect } from 'chai';
import { assert } from 'chai';
import cascade from '../lib/cascade.js';

const selectors = ['win', 'mac', 'linux', 'ios', 'android', 'x64', 'x86', 'simulator', 'clang', 'gcc', 'clion'];

const testAObject = {
  useAccel: 0,
  win: {
    useAccel: 1,
    x86: {
      useAccel: 2
    },
    x64: {
      useAccel: 3
    }
  },
  mac: {
    useAccel: 4,
    x86: {
      useAccel: 5
    },
    x64: {
      useAccel: 6
    }
  }
};

const testASelectors = [
  ['mac', 'x64'],
  ['win'],
  ['win', 'x64']
];

const testAExpected = [
  {useAccel: 6}
,
  {useAccel: 1}
,
  {useAccel: 3}
];

const testObjB = {
  'mac ios': {
    flag: true
  },
  other: "setting",
  build: {
    with: "error A",
    'mac ios': {
      sources: {
        matching: [ 'apple.c' ]
      }
    },
    mac: {
      with: "cmake"
    }
  },
  x64: {
    build: {
      with: "error C",
      mac: {
        with: "ninja",
        clion: {
          with: "cmake"
        }
      }
    }
  },
  win: {
    build: {
      with: {
        x64: "clang",
        x86: "gcc"
      }
    }
  }
};

const testBSelectors = [
  ['mac', 'x64'],
  ['mac', 'x64', 'clion'],
  ['win'],
  ['win', 'x64']
];

const testBExpected = [{
  flag: true,
  other: "setting",
  build: {
    with: "ninja",
    sources: { matching: [ 'apple.c' ]
  }
  }
}
, {
  flag: true,
  other: "setting",
  build: {
    with: "cmake",
    sources: { matching: [ 'apple.c' ]
  }
  }
}
, {
  build: { with: "error A"
},
  other: "setting"
}
, {
  build: { with: "clang"
},
  other: "setting"
}
];

const stdCompilerFlags = {
  clang: {
    ios: {
      arch: "arm64"
    },
    arch: "x86"
  }
};

const testCSelectors = [
  ['ios', 'clang'],
  ['linux', 'gcc']
];

const testCExpected = [
  {arch: "arm64"}
,
  {}
];

describe('check', function() {
  it('matches selectors', function(done) {
    assert.ok(cascade.matchesSelectors(['ios', 'mac', 'win'], 'x86 mac win'));
    assert.ok(cascade.matchesSelectors(['ios', 'mac', 'win'], 'ios'));
    return done();
  });
  it('doesnt match selectors', function(done) {
    assert.ok(!cascade.matchesSelectors(['apple', 'bananna'], 'x86'));
    assert.ok(!cascade.matchesSelectors(['apple', 'bananna'], ['x86', 'ios']));
    return done();
  });
  it('cascade selectors shallow', function(done) {
    for (const i in testASelectors) {
      assert.deepEqual(cascade.shallow(testAObject, selectors, testASelectors[i]), testAExpected[i]);
    }
    return done();
  });
  return it('cascade selectors deep', function() {
    for (var i in testBSelectors) {
      expect(cascade.deep(testObjB, selectors, testBSelectors[i])).to.deep.equal(testBExpected[i]);
    }
    return (() => {
      const result = [];
      for (i in testCSelectors) {
        result.push(expect(cascade.deep(stdCompilerFlags, selectors, testCSelectors[i])).to.deep.equal(testCExpected[i]));
      }
      return result;
    })();});});
