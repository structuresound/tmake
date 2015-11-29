name: "project"
version: "0.1.0"
provider: "myuser"
deps: [
  name: "hello"
  version: "0.1.0"
  provider: "leif"
,
  name: "helloGit"
  version: "0.1.0"
  git:
    url: "https://github.com/structuresound/hello-bbt.git"
  transform: true
  build: "gyp"
  install: false
,
  name: "helloCustom"
  version: "0.1.0"
  provider: "git"
  git:
    url: "https://github.com/structuresound/hello-bbt.git"
    config: ->
      user: ""
      password: ""
      rsa: ""
  transform:
    config: ->
      ext_replace: require 'gulp-ext-replace'
      customFunction: (file, cb) ->
        console.log file.path
        cb null, file
    pipeline: ->
      @src ['/**/*.cpp', '!exclude.cpp']
      .pipe @ext_replace '.cc'
      .pipe @dest '.bbt/transform/helloCustom'
  build:
    sources: ['**/*.cc']
    type: "gyp"
    config: ->
      flags: stdlib: 'c++11'
  install:
    glob: ['**/*.a']
    dest: 'exmaple_lib'
]
