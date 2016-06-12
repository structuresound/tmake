DepGraph = require('dependency-graph').DepGraph
_ = require 'underscore'
_p = require("bluebird")
path = require('path')
colors = require ('chalk')
check = require './check'

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


module.exports = (argv, db, runDir) ->
  that = {}
  cache = {}
  _graph = new DepGraph()

  that.resolvePaths = (dep) ->
    return _p.resolve dep if dep.d?.resolved

    arrayify = (val) ->
      if check(val, Array) then val
      else [ val ]

    pathArray = (val, root) ->
      _.map arrayify(val), (v) -> fullPath v, root

    fullPath = (p, root) ->
      if p.startsWith('/') then p else path.join root, p

    defaultPathOptions =
      home: argv.cachePath
      source: ""
      headers: ""
      test: "build_tests"
      clone: "source"
      temp: "transform"
      includeDirs: ""
      project: ""

    if dep.git?.archive
      defaultPathOptions.clone = "#{dep.name}-#{dep.git.archive}"
    pathOptions = _.deepObjectExtend defaultPathOptions, dep.path

    pathOptions.build ?= path.join pathOptions.project, "build"

    pathOptions.install ?= {}
    pathOptions.install.headers ?=
      from: path.join pathOptions.clone, "include"

    pathOptions.install.libraries ?=
      from: pathOptions.build

    pathOptions.install.binaries ?=
      from: pathOptions.build

    pathOptions.install.binaries.to ?= 'bin'
    d = _.extend {}, dep.d
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
    d.includeDirs = pathArray (pathOptions.includeDirs || "source/include"), d.root
    d.build ?= path.join d.root, pathOptions.build

    d.install =
      binaries: _.map arrayify(pathOptions.install.binaries), (ft) ->
        matching: ft.matching
        from: path.join d.root, ft.from
        to: path.join d.root, (ft.to || 'bin')
      headers: _.map arrayify(pathOptions.install.headers), (ft) ->
        matching: ft.matching
        from: path.join d.root, ft.from
        to: path.join d.home, (ft.to || 'include')
        includeFrom: path.join d.home, (ft.includeFrom || ft.to || 'include')
      libraries: _.map arrayify(pathOptions.install.libraries), (ft) ->
        matching: ft.matching
        from: path.join d.root, ft.from
        to: path.join d.home, (ft.to || 'lib')

    d.resolved = true
    dep.d = d

    _p.resolve dep

  that.resolveDep = (dep) ->
    dep.name ?= that.resolveDepName dep
    dep.target ?= 'static'
    dep.test ?= {}
    dep.cache ?= test: {}
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
      if check dep.git, String
        dep.git.slice(dep.git.indexOf('/') + 1)
      else if dep.git.repository
        dep.git.repository.slice(dep.git.repository.indexOf('/') + 1)
      else if dep.git.url
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
