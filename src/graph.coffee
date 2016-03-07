Promise = require 'bluebird'
DepGraph = require('dependency-graph').DepGraph
_ = require 'underscore'

module.exports = (db) ->
  that = {}
  cache = {}
  graph = new DepGraph()

  processDeps = (root) ->
    if root.deps
      db.find
        name:
          $in: _.map root.deps, (dep) -> dep.name
      .then (deps) ->
        Promise.each deps, (branch) ->
          that.graph branch, graph
          .then -> graph.addDependency root.name, branch.name
      .then -> Promise.resolve()
    else Promise.resolve()

  that.graph = (root) ->
    if cache[root.name] then Promise.resolve graph
    else
      graph.addNode root.name
      processDeps root
      .then ->
        cache[root.name] = root
        Promise.resolve graph

  that._map = (dep, mapFn) ->
    that.graph(dep).then (graph) ->
      Promise.resolve _.map graph.overallOrder(), mapFn

  that._map_deps = (dep, mapFn) ->
    that.graph(dep).then (graph) ->
      Promise.resolve _.map graph.dependenciesOf(dep), mapFn
      
  that.map = (dep, mapFn) -> that._map dep, (name) -> mapFn(cache[name])
  that.all = (dep) -> that._map dep, (name) -> cache[name]
  that.deps = (dep) -> that._map dep, (name) -> cache[name]

  that
