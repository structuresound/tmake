# bbt [![Build Status](https://secure.travis-ci.org/leif/bbt.png?branch=master)](http://travis-ci.org/leif/bbt)

buildless build tool can:

* pull dependencies from git
* build dependencies with cmake, gyp, or make
* auto-generate a cmakefile for your main file

it relies on

* nodejs
  * it is built in node
* some of the main npm dependencies
  * cmake-js for cmake
  * boost-lib for providing boost dependencies

it doesnt

* store anything anywhere other than the hidden .bbt

roadmap / next

* get a 'core set of libraries and examples'
* build things inside of docker for more versions support cross-compile-ability

## To Install
```bash
npm install -g bbt
```
## Run an example
```bash
mkdir bbt-example && cd bbt-example
bbt example served
./build/example_served &
curl http://127.0.0.1:8080/hello
```

## What does that last script do?

running 'bbt example' will copy in something like this

bbt.coffee
```coffee
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
```
src/main.cpp
```cpp
#include <served/served.hpp>

int main(int argc, char const* argv[]) {
    // Create a multiplexer for handling requests
    served::multiplexer mux;

    // GET /hello
    mux.handle("/hello")
        .get([](served::response & res, const served::request & req) {
            res << "Hello world!";
        });

    // Create the server and run with 10 handler threads.
    served::net::server server("127.0.0.1", "8080", mux);
    server.run(10);

    return (EXIT_SUCCESS);
}
```

## Contributing
This tool is currently experimental, and possibly not useful, examine at your own risk.

## Release History
_(Nothing yet)_

## License
Copyright (c) 2015 structuresound  
Licensed under the MIT license.
