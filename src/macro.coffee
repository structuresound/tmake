_ = require 'underscore'
path = require('path')

check = require './check'
interpolate = require('./interpolate')
fs = require './fs'
sh = require('./sh')

module.exports = (macro) ->
  platform = require('./platform')(undefined, macro)

  cache = {}

  replaceMacro = (m) ->
    if check(m, String)
      if cache[m] then cache[m]
      else if macro[m] then replaceMacro macro[m]
      else if platform.macro[m] then replaceMacro platform.macro[m]
      else
        commands = m.match(/\${[^}\r\n]*}/g)
        if commands
          interpolated = m
          _.each commands, (c) ->
            interpolated = interpolated.replace c, sh.get(c.slice(2, -1))
          cache[m] = interpolated
        else m
    else if check(m, Object)
      throw new Error 'object must have macro key and optional map' unless m.macro
      res = replaceMacro m.macro
      if m.map then m.map[res]
      else res
    else m
