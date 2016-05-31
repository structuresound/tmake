check = require './check'
_ = require('underscore')
_p = require("bluebird")
colors = require ('chalk')

module.exports = (p) ->
  _.mixin 'sortKeysBy': (obj, comparator) ->
    keys = _.sortBy(_.keys(obj), (key) ->
      if comparator then comparator(obj[key], key) else key
    )
    _.object keys, _.map(keys, (key) ->
      obj[key]
    )

  c =
    g: colors.green
    y: colors.yellow

  commands = ->
    packageCommand = (desc) ->
      name: "package"
      type: ["String", "Undefined"]
      typeName: "optional string"
      description: desc
    example:
      name: "example"
      type: ["String", "Undefined"]
      typeName: "optional"
      description: ["copy an #{c.y "example"} to the current directory","the default is a c++11 http server: #{c.y "served"}"]
    ls: packageCommand "list state of a #{c.y "package"} from the local #{p} database"
    path: packageCommand "list local directories for a #{c.y "package"} from the local #{p} database"
    install: packageCommand "copy libs and headers to destination"
    all: packageCommand "fetch, update, build, install"
    fetch: packageCommand "git / get dependencies for all or #{c.y "package"}"
    configure: packageCommand "configure build system #{c.y "package"}"
    build: packageCommand "build this project or dependency #{c.y "package"}"
    push: packageCommand "upload the current config file to the #{p} package repository"
    link: packageCommand "link the current or specified #{c.y "package"} to your local package repository"
    unlink: packageCommand "remove the current or specified #{c.y "package"} from your local package repository"
    clean: packageCommand "clean project, #{c.y "package"}, or 'all'"
    rm: packageCommand "remove file cache, #{c.y "package"}, or 'all'"
    test: packageCommand "test this project or dependency #{c.y "package"}"
    init: description: "create new tmake project file @ config.cson"
    help: description: "usage guide"

  parseOptions = (cmd) ->
    throw "unknown command" unless commands()[cmd]
    commands()[cmd]

  usage = (cmd) ->
    o = parseOptions cmd
    "#{colors.gray "usage:"} #{p} #{colors.green cmd} #{colors.yellow o.name} \n#{colors.gray o.description}"

  manual = ->
    man = """

          #{colors.gray "usage:"} #{p} #{colors.green("command")} #{colors.yellow("option")}

          """
    _.each _.sortKeysBy(commands()), (o, cmd) ->
      if o.name
        man +=    "           #{colors.green(cmd)} #{colors.yellow(o.name)} #{colors.gray o.typeName || o.type}\n"
      else
        man +=    "           #{colors.green(cmd)}\n"
      if check o.description, Array
        _.each o.description, (d) ->
          man += colors.gray "              #{d}\n"
      else man += colors.gray "              #{o.description}\n"
    man

  defaultPackage =
    name: "newProject"
    version: "0.0.1"
    target: "bin"
    build:
      with: "cmake"

  createPackage = ->
    new _p (resolve) ->
      resolve defaultPackage

  parse: (argv) ->
    cmd = argv._[0]
    throw manual() unless check cmd, String
    throw usage(cmd) unless check argv._[1], parseOptions(cmd).type
  hello: -> "if this is a new project run '#{p} example' or type '#{p} help' for more options"
  createPackage: createPackage
  manual: manual
