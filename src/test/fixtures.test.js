export default {
  depA: {
    name: "assert",
    git: "hello/world",
    HELLO: "hello",
    WORLD: "world",
    CC: "/usr/bin/gcc",
    BSON_BYTE_ORDER: {
      macro: "{OS_ENDIANNESS}",
      map: {
        LE: 1234,
        BE: 4321
      }
    },
    OPENSSL_VERSION: "1.0.1",
    configure: {
      linux: {
        echo: 'echo linux world'
      },
      win: {
        echo: 'echo win world'
      },
      'mac ios': {
        with: "ninja",
        echo: 'echo apple world'
      },
      mac: {
        cmd: "./Configure {OSX_SDK_VERSION} --openssldir=\"/tmp/openssl-{OPENSSL_VERSION}\""
      },
      keyword: "don't run this"
    }
  },

  depB: {
    name: "manual",
    git: "hello/world",
    path: {
      includeDirs: [
        "testIncludeDir",
        "another"
      ]
    }
  },

  helloWorld: {
    name: 'hello',
    git: "structuresound/hello",
    target: "bin",
    build: {
      with: "ninja",
      xcode: {
        with: "xcode"
      }
    },
    deps: [{
      git: {
        repository: "google/googconstest",
        archive: "release-1.7.0"
      },
      build: {
        with: "cmake"
      },
      path: {
        project: "source"
      }
    }
    ]
  }
};
