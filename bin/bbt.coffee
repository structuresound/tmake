name: "project"
version: "0.1.0"
provider: "myuser"
deps: [
  name: "hello"
  version: "0.1.0"
  provider: "leif"
,
  name: "helloGyp"
  version: "0.1.0"
  git:
    url: "https://github.com/structuresound/hello-bbt.git"
  transform: true
  build: with: "gyp"
  install: false
,
  name: "helloCmake"
  version: "0.1.0"
  git:
    url: "https://github.com/structuresound/hello-bbt.git"
  transform: true
  build: with: "cmake"
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
      customFunction: (file, cb) ->
        console.log file.path
        cb null, file
    pipeline: ->
      @src ['**/*.cpp', '!exclude.cpp']
      .pipe @dest '.bbt/transform/helloCustom'
  build:
    with: "gyp"
    sources: ['**/*.cpp']
    config: ->
      flags: stdlib: 'c++11'
  install:
    glob: ['**/*.a']
    dest: 'exmaple_lib'
]
