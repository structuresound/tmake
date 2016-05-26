DepGraph = require('dependency-graph').DepGraph
_ = require 'underscore'
_p = require("bluebird")
path = require('path')
colors = require ('chalk')

deepObjectExtend = (target, source) ->
  for prop of source
    if source.hasOwnProperty(prop)
      if Array.isArray(source[prop])
        target[prop] = source[prop]
      else if target[prop] and typeof source[prop] == 'object'
        deepObjectExtend target[prop], source[prop]
      else
        target[prop] = source[prop]
    else if target.hasOwnProperty(prop)
      delete target[prop]
  target

_.deepObjectExtend = (target, source) ->
  deepObjectExtend _.extend({}, target), source

arrayify = (val) ->
  if Array.isArray(val) then val
  else [ val ]

module.exports = (argv, db, runDir) ->
  that = {}
  cache = {}
  _graph = new DepGraph()

  that.resolvePaths = (dep) ->
    return _p.resolve dep if dep.d?.resolved

    defaultPathOptions =
      home: argv.cachePath
      source: ""
      headers: ""
      tests: "test"
      clone: "source"
      temp: "transform"
      build: "build"
      includeDirs: ["source"]
      project: ""
      install:
        binaries:
          from: "build"
          to: ""
        headers:
          from: "source"
          to: "include"
        libraries:
          from: "build"
          to: "lib"

    pathOptions = _.deepObjectExtend defaultPathOptions, dep.path
    # console.log JSON.stringify pathOptions, 0, 2
    d = _.extend {}, dep.d
    #console.log colors.yellow 'existing dirs ' + JSON.stringify dep.d
    # fetch
    d.home ?= "#{runDir}/#{pathOptions.home}" # reference for build tools, should probably remove
    d.root ?= path.join d.home, dep.name # lowest level a package should have access to
    d.temp ?= path.join d.root, pathOptions.temp
    d.clone ?= path.join d.root, pathOptions.clone
    # build
    if dep.transform
      d.source = path.join d.temp, pathOptions.source
    else
      d.source = path.join d.clone, pathOptions.source
    d.project = path.join d.root, pathOptions.project || ""
    # console.log colors.magenta d.project
    d.includeDirs = _.map arrayify(pathOptions.includeDirs), (relPath) -> path.join d.source, relPath
    d.build ?= path.join d.root, pathOptions.build
    # install

    d.install =
      binaries: _.map arrayify(pathOptions.install.binaries), (ft) ->
        from: path.join d.root, ft.from
        to: path.join d.home, (ft.to || defaultPathOptions.install.binaries.to)
      headers: _.map arrayify(pathOptions.install.headers), (ft) ->
        from: path.join d.root, ft.from
        to: path.join d.home, (ft.to || defaultPathOptions.install.headers.to)
      libraries: _.map arrayify(pathOptions.install.libraries), (ft) ->
        from: path.join d.root, ft.from
        to: path.join d.home, (ft.to || defaultPathOptions.install.libraries.to)

    # if dep.name == 'libbson'
    #   console.log colors.magenta JSON.stringify(pathOptions.install.headers, 0, 2)
    #   console.log colors.magenta JSON.stringify(d.install, 0, 2)

    d.resolved = true
    dep.d = d

    # if dep.name == 'libbson'
    #   console.log colors.green JSON.stringify(dep.d, 0, 2)

    _p.resolve dep

  that.resolveDep = (dep) ->
    dep.name ?= that.resolveDepName dep
    dep.target ?= 'static'
    db.findOne name: dep.name
    .then (result) ->
      merged = _.deepObjectExtend result || {}, dep
      entry = _.extend {}, merged
      if entry.deps
        entry.deps = _.map entry.deps, (d) -> name: that.resolveDepName(d)
      delete entry.d
      if result
        db.update {name: dep.name}, {$set: entry}
        .then -> that.resolvePaths merged
      else
        db.insert entry
        .then -> that.resolvePaths merged


  that.resolveDepName = (dep) ->
    if dep.name then return dep.name
    else if dep.git
      if typeof dep.git == 'string' then dep.git.slice(dep.git.indexOf('/') + 1)
      else
        lastPathComponent = dep.git?.url?.slice(dep.git?.url.lastIndexOf('/') + 1)
        lastPathComponent.slice 0, lastPathComponent.lastIndexOf '.'

  resolveDeps = (root, graph) ->
    if root.deps
      _p.each root.deps, (dep) ->
        that.resolveDep dep
        .then (resolved) ->
          throw new Error "recursive dependency" if resolved.name == root.name
          that.graph resolved, graph
          .then ->
            console.log 'add dependency', resolved.name, ">>", root.name
            graph.addDependency root.name, resolved.name
    else
      _p.resolve()

  that.graph = (root, graph) ->
    if cache[root.name] then _p.resolve graph
    else
      graph.addNode root.name
      resolveDeps root, graph
      .then ->
        cache[root.name] = root
        _p.resolve graph

  that._map = (dep, mapFn) ->
    that.graph(dep, _graph).then (graph) ->
      _p.resolve _.map graph.overallOrder(), mapFn

  that._map_deps = (dep, mapFn) ->
    that.graph(dep, _graph).then (graph) ->
      _p.resolve _.map graph.dependenciesOf(dep.name), mapFn

  that.map = (dep, mapFn) -> that._map dep, (name) -> mapFn(cache[name])
  that.all = (dep) ->
    cache = {}
    that._map dep, (name) -> cache[name]
  that.deps = (dep) ->
    cache = {}
    that._map_deps dep, (name) -> cache[name]

  that
