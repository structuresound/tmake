import {assert} from 'chai';
import cascade from '../lib/util/cascade';

const keywords = [
  'win',
  'mac',
  'linux',
  'ios',
  'android',
  'x64',
  'x86',
  'simulator',
  'clang',
  'gcc',
  'clion'
];

const testAObject = {
  useAccel: 0,
  'win, linux': {
    useAccel: 1,
    x86: {
      useAccel: 2
    },
    x64: {
      useAccel: 3
    }
  },
  'mac, ios': {
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
  [
    'mac', 'x64'
  ],
  ['win'],
  ['win', 'x64']
];

const testAExpected = [
  {
    useAccel: 6
  }, {
    useAccel: 1
  }, {
    useAccel: 3
  }
];

const testObjB = {
  'mac, ios': {
    flag: true
  },
  other: 'setting',
  build: {
    with: 'error A',
    'mac, ios': {
      sources: {
        matching: ['apple.c']
      }
    },
    'mac': {
      with: 'cmake'
    }
  },
  'x64': {
    build: {
      with: 'error C',
      'mac': {
        with: 'ninja',
        clion: {
          with: 'cmake'
        }
      }
    }
  },
  'win': {
    build: {
      with: {
        'x64': 'clang',
        'x86': 'gcc'
      }
    }
  }
};

const testBSelectors = [
  [
    'mac', 'x64'
  ],
  [
    'mac', 'x64', 'clion'
  ],
  ['win'],
  ['win', 'x64']
];

const testBExpected = [
  {
    flag: true,
    other: 'setting',
    build: {
      with: 'ninja',
      sources: {
        matching: ['apple.c']
      }
    }
  }, {
    flag: true,
    other: 'setting',
    build: {
      with: 'cmake',
      sources: {
        matching: ['apple.c']
      }
    }
  }, {
    build: {
      with: 'error A'
    },
    other: 'setting'
  }, {
    build: {
      with: 'clang'
    },
    other: 'setting'
  }
];

const testObjC = {
  clang: {
    ios: {
      arch: 'arm64'
    },
    arch: 'x86'
  }
};

const testCSelectors = [
  [
    'ios', 'clang'
  ],
  ['linux', 'gcc']
];

const testCExpected = [
  {
    arch: 'arm64'
  }, {}
];

describe('select', () => {
  it('matches', () => {
    assert.ok(cascade.select(['apple'], 'apple'));
  });
  it('matches OR', () => {
    assert.ok(cascade.select([
      'ios', 'mac', 'win'
    ], 'x86, mac, win'));
  });
  it('matches AND', () => {
    assert.ok(cascade.select([
      'apple', 'bananna'
    ], 'apple bananna'));
  });
  it('fails', () => {
    assert.ok(!cascade.select([
      'apple', 'bananna'
    ], 'x86'));
  });
  it('fails AND', () => {
    assert.ok(!cascade.select(['apple'], 'apple bananna'));
  });
  it('fails OR/AND', () => {
    assert.ok(!cascade.select(['bananna'], 'apple, bananna orange'));
  });
});

describe('cascade', () => {
  for (const i in testASelectors) {
    it(`select A${i} ${testASelectors[i]}`, () => {
      const result = cascade.shallow(testAObject, keywords, testASelectors[i]);
      assert.deepEqual(result, testAExpected[i]);
    });
  }
  for (const i in testBSelectors) {
    it(`select B${i} ${testBSelectors[i]}`, () => {
      const result = cascade.deep(testObjB, keywords, testBSelectors[i]);
      assert.deepEqual(result, testBExpected[i]);
    });
  }
  for (const i in testCSelectors) {
    it(`select C${i} ${testCSelectors[i]}`, () => {
      const result = cascade.shallow(testObjC, keywords, testCSelectors[i]);
      assert.deepEqual(result, testCExpected[i]);
    });
  }
});
