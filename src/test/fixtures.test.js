const profileTester = {
  name: 'testConf',
  profile: {
    target: {
      platform: 'meta',
      endianness: 'BE'
    }
  },
  HELLO: 'hello',
  WORLD: 'world',
  CC: '/usr/bin/gcc',
  BSON_BYTE_ORDER: {
    macro: '{profile.target.endianness}',
    map: {
      LE: 1234,
      BE: 4321
    }
  },
  TEST_SDK_VERSION: 'meta-1.0',
  OPENSSL_VERSION: '1.0.1',
  configure: {
    'target-meta': {
      with: 'meta-ninja',
      cmd: './Configure {TEST_SDK_VERSION} --openssldir=\'/tmp/openssl-{OPENSSL_VERSION}\''
    },
    keyword: 'don\'t run this'
  },
  expect: {
    BSON_BYTE_ORDER: 4321,
    configure: {
      with: 'meta-ninja',
      cmd: './Configure meta-1.0 --openssldir=\'/tmp/openssl-1.0.1\''
    }
  }
};

const helloWorld = {
  name: 'hello',
  git: 'structuresound/hello',
  target: 'bin',
  build: {
    with: 'ninja',
  },
  deps: [
    {
      git: {
        repository: 'google/googletest',
        archive: 'release-1.7.0'
      },
      build: {
        with: 'cmake'
      },
      path: {
        project: 'source'
      }
    }
  ]
};

export {profileTester, helloWorld};
