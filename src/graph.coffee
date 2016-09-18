DepGraph = require('dependency-graph').DepGraph
_ = require 'underscore'
_p = require("bluebird")
path = require('path')
check = require './check'
fs = require('./fs')
cascade = require('./cascade')

module.exports = (argv, db, platform) ->
  parsePath = (s) ->
    throw new Error "#{s} is not a string" unless check s, String
    if s.startsWith '/' then s
    else path.join argv.runDir, s

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

    # _.extend dep, fs.readConfigSync "#{argv.runDir}/#{argv.cachePath}/#{dep.name}/package.cson"
    if dep.link
      console.log "link settings #{parsePath dep.link}package.cson"
      rawConfig = fs.readConfigSync "#{parsePath dep.link}package.cson"
      _.extend dep, cascade.deep rawConfig, platform.keywords(), platform.selectors()

    defaultPathOptions =
      source: ""
      headers: ""
      test: "build_tests"
      clone: "source"
      temp: "transform"
      includeDirs: ""
      project: ""

    # if dep.git?.archive
    #   defaultPathOptions.clone = "#{dep.name}-#{dep.git.archive}"
    pathOptions = _.extend defaultPathOptions, dep.path

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
    d.home ?= "#{argv.runDir}/#{argv.cachePath}" # reference for build tools, should probably remove
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

    if pathOptions.install.assets
      d.install.assets = _.map arrayify(pathOptions.install.assets), (ft) ->
        matching: ft.matching
        from: path.join d.root, ft.from
        to: path.join d.root, (ft.to || 'bin')

    d.resolved = true
    dep.d = d
    dep.p = pathOptions

    _p.resolve dep

  that.resolveDep = (dep) ->
    dep.name ?= that.resolveDepName dep
    dep.target ?= 'static'
    dep.cache ?= test: {}
    db.findOne name: dep.name
    .then (result) ->
      merged = dep
      if result
        _.extend merged, _.pick result, ['cache', 'libs']
      entry = _.clone merged
      if entry.deps
        entry.deps = _.map entry.deps, (d) -> name: that.resolveDepName(d)
      delete entry.d
      if result
        db.update {name: dep.name}, {$set: entry}
        .then -> that.resolvePaths merged
      else
        db.insert entry
        .then -> that.resolvePaths merged

  # that.resolveDep = (dep) ->
  #   dep.name ?= that.resolveDepName dep
  #   dep.target ?= 'static'
  #   dep.test ?= {}
  #   dep.cache ?= test: {}
  #   db.findOne name: dep.name
  #   .then (result) ->
  #     if result
  #       _.extend dep, _.pick result, ['cache', 'libs'] # READ FROM CACHE
  #     cache = _.clone dep
  #     if cache.deps
  #       cache.deps = _.map cache.deps, (d) -> name: that.resolveDepName(d)
  #     delete cache.d
  #     delete cache.p
  #     if result
  #       db.update {name: cache.name}, {$set: cache}
  #       .then -> that.resolvePaths dep
  #     else
  #       db.insert cache
  #       .then -> that.resolvePaths dep

  that.resolveDepName = (dep) ->
    if check dep, String then dep
    else if check dep.name, String then dep.name
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
            if argv.verbose then console.log 'add dependency', resolved.name, ">>", root.name
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
