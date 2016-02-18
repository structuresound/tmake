# bbt [![Build Status](https://secure.travis-ci.org/leif/bbt.png?branch=master)](http://travis-ci.org/leif/bbt)

buildless build tool can:

* pull dependencies from git
* build dependencies with cmake, gyp, or make
* auto-generate a cmakefile for your main file

## REQUIREMENTS

* nodejs - https://nodejs.org/en/
  * it is built in node
  * https://www.google.com/search?client=safari&rls=en&q=install+nodejs&ie=UTF-8&oe=UTF-8
* cmake - https://cmake.org
  * if you're going to build anything with cmake
  * https://www.google.com/search?client=safari&rls=en&q=install+cmake&ie=UTF-8&oe=UTF-8
* some build tools i.e.
  * xcode on mac
  * build-essentials on linux
  * visual studio something on mac

## roadmap / next

this is a new project, it's barely functional. these things need to be done

* get depconf server running
* put some libs on it

maybe

* docker build / cross-compile ability

## To Install
```bash
npm install -g bbt
```
## Run an example
```bash
mkdir bbt-example && cd bbt-example
bbt example served
bbt
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

## Reasons this might be a good idea?

* because the node-js ecosystem is inspiring and there should be something like it for c++
* because existing tools that make it convenient to build c++ apps usually giant frameworks that are mutually incompatible, and / or poorly user extensible
* because json is a nice way to config your deps
* because deps should be continuously tested
* because any cloud vm should be able to run your builds too
* because gulp makes it easy to transform existing repos

## Contributing
This tool is currently experimental, and possibly not useful, examine at your own risk.

## Release History
_(Nothing yet)_

## License
Copyright (c) 2016 1e1f
Licensed under the MIT license.
