# TrieMake uses JSON to configure/build/test large c++ dependency trees [![Build Status](https://secure.travis-ci.org/structuresound/tmake.png?branch=master)](http://travis-ci.org/structuresound/tmake) [![Coverage Status](https://coveralls.io/repos/github/structuresound/tmake/badge.svg?branch=master)](https://coveralls.io/github/structuresound/tmake?branch=master)
[![NPM](https://nodei.co/npm/tmake.png?downloads=true)](https://nodei.co/npm/tmake/)

### warning

This tool is currently experimental, and possibly not useful, examine at your own risk.
check out (not my project) https://conan.io if you need c++ dependency management today

## What ?

* npm for c++, (but not really because scripting vs symbols, em i rite?)

## Why ?

* native code runs fast, is safe, saves electricity

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

other things of note

* can be run directly on mac / win / linux with node
* can use docker run 1e1f/tmake (if linux host environment is ok)

## current roadmap, things aren't done that need to be

host: yaml configs as json in a central repo
cache: store static_libs + headers against config hash
clang cross-compile and dynamic support for different toolchain / sysroot

## philosophies

* always be cross-compiling
* statically link all the things
* declarative yaml / json only, no imperative configuration logic
* can override settings in any dependency from any point below it in the config tree
* cascading selectors make configuration as DRY as possible
* support other build tools (ninja, cmake, make, gyp)
* be embeddable in another project / build system
* avoid use of any globals on dev machine, project folder is the universe
* no explicit publication of built source, just pull a hash if it exists

## To Install
```bash
npm install -g tmake
```

## REQUIREMENTS

Trying to make this as automatic as possible

depends on node
fetches most other aspects of the toolchain, except for git + cmake (presently)

* nodejs - https://nodejs.org/en/
  * it is built in node
  * https://www.google.com/search?client=safari&rls=en&q=install+nodejs&ie=UTF-8&oe=UTF-8
* build tools
  * ninja - will be automatically installed locally
  * cmake - https://cmake.org https://www.google.com/search?client=safari&rls=en&q=install+cmake&ie=UTF-8&oe=UTF-8
* some build tools i.e.
  * xcode on mac
  * build-essentials on linux
  * maybe works on windows? (i haven't checked yet)

## Run an example
```bash
mkdir tmake-example && cd tmake-example
tmake example served
tmake
./build/example_served &
curl http://127.0.0.1:8080/hello
```

## What's the build file look like?

a simple cross platform zlib config

```yaml
---
git:
  repository: madler/zlib
  tag: v1.2.8
configure:
  replace:
    gzguts:
      matching:
        - "gzguts.h"
      inputs:
        unistd:
        - "#ifdef _LARGEFILE64_SOURCE"
        - "#include <unistd.h>\n#ifdef _LARGEFILE64_SOURCE"
build:
  with: ninja
  sources:
    matching:
      - "*.c"
  compilerFlags:
    ios:
      miphoneos-version-min: "=6.0"
  cFlags:
    O: 3
    Wall: true
    Wwrite-strings: true
    Wpointer-arith: true
    Wconversion: true
    ios:
      "fembed-bitcode": true

```

## Contributing
see 'warning' at the top, *update* this project is ALMOST useful now, please holler at structuresound@gmail.com if you're interested in this project

## Release History
_(Nothing yet)_

## License
Copyright (c) 2018 1e1f
Licensed under the MIT license.
