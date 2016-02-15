name: "test_server"
build:
  with: "cmake"
  target: "bin"
  boost: libs: ["asio", "system"]
deps: [
  git: "datasift/served"
  build:
    cmake:
      configure:
        RE2_LIBRARY: "~/lib/libre2.a"
        RE2_INCLUDE_DIR: "~/include"
        SERVED_BUILD_STATIC: "ON"
        SERVED_BUILD_TESTS: "OFF"
        SERVED_BUILD_SHARED: "OFF"
  install:
    headersPath: 'src'
    libPath: 'lib'
  deps: [
    git: "google/re2"
    build: "make"
  ]
]
