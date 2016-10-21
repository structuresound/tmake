path = require('path')
sh = require "shelljs"
Promise = require 'bluebird'
fs = require('../util/fs')
_log = require('../util/log')
{ stringHash } = require '../util/hash'
_ = require 'underscore'
_fetch = require '../util/fetch'
check = require('../util/check')
require('../util/string')

stdToolchain =
  "mac ios":
    clang:
      bin: "$(which gcc)"
  linux:
    gcc:
      bin: "$(which gcc)"

# customToolchain =
#   "mac ios":
#     clang:
#       bin: "bin/clang"
#       include:
#         "libc++": "include/c++/v1"
#       # libs: ["lib/libc++."]
#       url: "http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-apple-darwin.tar.xz"
#       signature: "http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-apple-darwin.tar.xz.sig"
#   linux:
#     gcc:
#       bin: "$(which gcc)"
#       url: "http://www.netgull.com/gcc/releases/gcc-6.2.0/gcc-6.2.0.tar.gz"
#     clang:
#       bin: "bin/clang"
#       url: "http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-linux-gnu-ubuntu-16.04.tar.xz"
#       signature: "http://llvm.org/releases/3.9.0/clang+llvm-3.9.0-x86_64-linux-gnu-ubuntu-16.04.tar.xz.sig"

module.exports = (argv, dep, platform, db) ->
  log = _log argv

  { fetch } = _fetch(argv, dep, platform, db)

  sanityCheck = ->
    throw new Error "no userCache specified" unless argv.userCache

  fetchAndUnarchive = (tool) ->
    sanityCheck()
    rootDir = path.join argv.userCache, 'toolchain', tool.name
    unless fs.existsSync rootDir
      sh.mkdir '-p', rootDir
    tempDir = path.join argv.userCache, 'temp', stringHash(tool.url)
    toolpath = pathForTool tool
    fetch tool.url
    .then (archivePath) ->
      tooldir = path.join argv.userCache, 'toolchain', tool.name, stringHash(tool.url)
      fs.unarchive archivePath, tempDir, tooldir, toolpath

  buildSystems = [
    'cmake'
    'ninja'
  ]
  compilers = [
    "clang"
    "gcc"
    "msvc"
  ]

  toolPaths = (toolchain) ->
    tools = {}
    _.each Object.keys(toolchain), (name) ->
      tools[name] = pathForTool toolchain[name]
    tools

  pathForTool = (tool) ->
    if tool.bin.startsWith '/'
      return tool.bin
    throw new Error "tool needs a resolved name, #{tool}" unless check tool.name, String
    throw new Error "tool needs a resolved bin, #{tool.name}" unless check tool.bin, String
    throw new Error "tool needs a resolved url, #{tool.name}" unless check tool.url, String
    hash = stringHash tool.url
    path.join argv.userCache, 'toolchain', tool.name, hash, tool.bin

  fetchToolchain = (toolchain) ->
    throw new Error "toolchain not object" unless check toolchain, Object
    Promise.each Object.keys(toolchain), (name) ->
      tool = toolchain[name]
      toolpath = pathForTool tool
      log.verbose "checking for tool: #{name} @ #{toolpath}"
      if toolpath
        fs.existsAsync toolpath
        .then (exists) ->
          if exists
            log.quiet "found #{name}"
            Promise.resolve toolpath
          else
            log.verbose "fetch #{name} binary from #{tool.url}"
            fetchAndUnarchive tool
            .then ->
              log.quiet "chmod 755 #{toolpath}"
              fs.chmodSync "#{toolpath}", 755
              Promise.resolve toolpath

  pathForTool: pathForTool
  fetch: fetchToolchain
  tools: (toolchain) -> toolPaths(toolchain)
  select: (toolchain) ->
    selected = platform.select (toolchain || stdToolchain), ignore: buildSystems.concat(compilers)
    _.each selected, (tool, name) ->
      tool.bin ?= name
      tool.name ?= name
    selected
