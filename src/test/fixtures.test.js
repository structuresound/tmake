const profileTester = {
  name: 'assert',
  git: 'hello/world',
  profile: {
    target: {
      platform: 'fakePlatform'
    }
  },
  HELLO: 'hello',
  WORLD: 'world',
  CC: '/usr/bin/gcc',
  BSON_BYTE_ORDER: {
    macro: '{OS_ENDIANNESS}',
    map: {
      LE: 1234,
      BE: 4321
    }
  },
  OPENSSL_VERSION: '1.0.1',
  configure: {
    'host-linux': {
      echo: 'echo linux world'
    },
    'host-win': {
      echo: 'echo win world'
    },
    'host-mac target-ios': {
      with: 'ninja',
      echo: 'echo apple world',
      cmd: './Configure {OSX_SDK_VERSION} --openssldir=\'/tmp/openssl-{OPENSSL_VERSION}\''
    },
    keyword: 'don\'t run this'
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
