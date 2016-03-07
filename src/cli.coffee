check = require './check'
_ = require('underscore')
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
    install: packageCommand description: "copy libs and headers to destination"
    all: packageCommand "fetch, update, build, install"
    fetch: packageCommand "git / get dependencies for all or #{c.y "package"}"
    build: packageCommand "build this project or dependency #{c.y "package"}"
    rebuild: packageCommand "ignore cache, and rebuild this project or #{c.y "dependency"}"
    push: description: "upload the current config file to the #{p} package repository"
    clean: packageCommand "clean project, #{c.y "package"}, or 'all'"
    test: packageCommand "test this project or dependency #{c.y "package"}"
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

  parse: (argv) ->
    cmd = argv._[0]
    throw manual() unless check cmd, String
    throw usage(cmd) unless check argv._[1], parseOptions(cmd).type
  hello: -> "if this is a new project run '#{p} example' or type '#{p} help' for more options"
  manual: manual
