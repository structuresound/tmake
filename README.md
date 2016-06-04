# TrieMake uses JSON to configure/build/test large c++ dependency trees [![Build Status](https://secure.travis-ci.org/structuresound/tmake.png?branch=master)](http://travis-ci.org/structuresound/tmake)

### warning

This tool is currently experimental, and possibly not useful, examine at your own risk.
check out (not my project) https://conan.io if you need c++ dependency management today

## 'it' can ->

* fetch
  * git branches or tarballs
* configure
  * create / replace / files ala autotools "config.h.in"
  * generate ninja or cmake files
  * or use directly those things i.e cmake --configure
* build
  * with ninja
  * easily override all cFlags / cxxFlags
* install
  * automagically aggregates headers and libs, but can override for specific copying
  * no 'make install' everything is stored locally, and dependencies include locally
* test
  * run tests -- not implemented yet

## To Install
```bash
npm install -g tmake
```

## REQUIREMENTS

Trying to make this as automatic as possible

depends on node and cmake to be pre-installed by user
fetches ninja binary when needed

* nodejs - https://nodejs.org/en/
  * it is built in node
  * https://www.google.com/search?client=safari&rls=en&q=install+nodejs&ie=UTF-8&oe=UTF-8
* build tools
  * ninja - will be automatically installed locally
  * cmake - https://cmake.org https://www.google.com/search?client=safari&rls=en&q=install+cmake&ie=UTF-8&oe=UTF-8
* some build tools i.e.
  * xcode on mac
  * build-essentials on linux
  * this doesn't work yet on windows, but will some day

## roadmap / next

currently working on getting central repo server built (with tmake / dogfood)

## Run an example
```bash
mkdir tmake-example && cd tmake-example
tmake example served
tmake
./build/example_served &
curl http://127.0.0.1:8080/hello
```

## What's the build file look like?

this would build google's libre2

```coffee
git: "google/re2"
build:
  with: "ninja"
  sources:
    ["re2/*.cc", "util/*.cc"]
  "linux mac":
    sources: ["re2/*.cc", "util/*.cc", "!util/threadwin.cc"]
  cflags:
    O3: 1
    std: "c++11"
    linux:
      pthread: 1
```

## Use a dependency

To depend on that re2 lib?

```coffee
name: myProject
sources: ["src/*.cpp"]
build: with: "ninja"
deps: [
  repo: "google/re2"
  build: cflags: linux: Wall: 0 #override something on our dep
]
```

## Reasons

* npm for c++, easier said then done
* native code can run fast, let's make it easy to share and build

# some influences / projects that inform the code

* social c++ (biiCode + conan.io)
* expressive configuration management (coffee / cson)
* structured tree as configuration file (json, mongo query language)
* export to a fast build system (cmake / ninja)
* lint / test packages as part of the contribute process (cocoapods)
* transform existing files using globs and streams (gulp / vinyl fs)
* flat dependencies / shallow trees (npm)
* no non-expiring caches locally (docker)

## philosophies

* structured data, easy to override anything all the way up a dependency tree
* overrides using css style selectors, object keys = selectors
* support other build tools
* be embeddable in another project / build system
* no globals, where possible - project folder is the universe
* cache all the way to .a files using hash of config file

## Contributing
This tool is currently experimental, and possibly not useful, examine at your own risk.

## Release History
_(Nothing yet)_

## License
Copyright (c) 2016 1e1f
Licensed under the MIT license.
