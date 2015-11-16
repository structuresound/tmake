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
