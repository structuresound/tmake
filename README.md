# bbt [![Build Status](https://secure.travis-ci.org/leif/bbt.png?branch=master)](http://travis-ci.org/leif/bbt)

buildless build tool can:

* pull dependencies from git
* build dependencies with cmake, gyp, or make
* auto-generate a cmakefile for your main file

## REQUIREMENTS

Trying to make this as automatic as possible

* nodejs - https://nodejs.org/en/
  * it is built in node
  * https://www.google.com/search?client=safari&rls=en&q=install+nodejs&ie=UTF-8&oe=UTF-8
* build tools
  * ninja - will be automatically installed locally
  * cmake - https://cmake.org https://www.google.com/search?client=safari&rls=en&q=install+cmake&ie=UTF-8&oe=UTF-8
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

## What's the build file look like?

this would package google's re2 library

```coffee
git: "google/re2"
build:
  sources: ["re2/*.cc", "util/*.cc"]
  linux: sources: ["!util/threadwin.cc"]
  mac: sources: ["!util/threadwin.cc"]
  with: "ninja"
  target: "static"
  cflags:
    O3: 1
    std: "c++11"
    g: 1
    pthread: 1
    Wall: 1
    Wextra: 1
    "Wno-unused-parameter": 1
    "Wno-missing-field-initializers": 1
```

## Use a dependency

To depend on that re2 lib?

```coffee
name: myProject
sources: ["src/*.cpp"]
build: with: "ninja"
deps: [
  db: "google/re2"
  build: cflags: linux: Wall: 0 #override something on our dep
]
```

## Reasons

* native code can run fast, let's make it easy to share and build

# standing on shoulders

* structured tree as configuration file (json)
* export to a fast build system (cmake -> ninja)
* lint / test packages as part of the contribute process (cocoapods)
* transform existing files using globs and streams (gulp / vinyl fs)
* flat dependencies / shallow trees (npm)
* no non-expiring caches locally (docker)

## philosophies

* structured data, easy to override anything all the way up a dependency tree
* overrides using css style selectors, swap object keys for classes
* support other build tools
* be embeddable in another project / build system
* no globals, where possible - project folder is the universe
* not a bitcoin miner, let's cache some things

## Contributing
This tool is currently experimental, and possibly not useful, examine at your own risk.

## Release History
_(Nothing yet)_

## License
Copyright (c) 2016 1e1f
Licensed under the MIT license.
