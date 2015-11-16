# bbt [![Build Status](https://secure.travis-ci.org/leif/bbt.png?branch=master)](http://travis-ci.org/leif/bbt)

buildless build tool pulls a git repo, optionally transforms it, and places it in your project somewhere

## Getting Started
Install the module with: `npm install -g bbt`

```bash
mkdir bbt-project && cd bbt-project
bbt init
```
running bbt init will place the following example config in your folder
```coffee
name: "project"
version: "0.1.0"
provider: "myuser"
deps: [
  name: "hello"
  version: "0.1.0"
  provider: "leif"
,
  name: "hello"
  version: "0.1.0"
  provider: "git"
  git:
    url: "https://github.com/structuresound/hello-bbt.git"
    config:
      user: ""
      password: ""
      rsa: ""
  transform:
    config:
      repl: (file, cb) ->
        console.log file.path
        cb null, file
    pipeline: ->
      @src ['./**/*.cpp', '!./exclude.cpp']
      .pipe @map @repl
      .pipe @dest './src'
]
```
running example will clone hello-bbt repo and copy all .cpp files except for exclude.cpp into ./src
```bash
bbt
cat src/hello.cpp
```

## Contributing
This tool is currently experimental, and possibly not useful, examine at your own risk.

## Release History
_(Nothing yet)_

## License
Copyright (c) 2015 structuresound  
Licensed under the MIT license.
