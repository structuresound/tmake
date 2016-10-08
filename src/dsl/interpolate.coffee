_ = require 'underscore'
check = require '../util/check'
{ valueForKeyPath } = require './cascade'

defaultLookup = (key, data) ->
  if key of data
    return data[key]
  else
    # look up the chain
    keyParts = key.split('.')
    if keyParts.length > 1
      valueForKeyPath key, data

_interpolate = (template, func) ->
  commands = template.match(/{[^}\r\n]*}/g)
  if commands
    if commands[0].length == template.length # allow for object replacement of single command
      res = func(commands[0].slice(1, -1))
      if check res, String then _interpolate res, func
      else res || template
    else
      interpolated = template
      modified = false
      _.each commands, (c) ->
        lookup = func c.slice(1, -1)
        if lookup
          modified = true
          interpolated = interpolated.replace c, lookup
      if modified
        _interpolate interpolated, func
      else
        template
  else template

interpolate = (template, funcOrData, opts) ->
  unless template then throw new Error "interpolate undefined"
  if check template, String
    func = funcOrData
    if funcOrData
      unless check funcOrData, Function
        func = (key) -> defaultLookup key, funcOrData
    else
      throw new Error "need to provide dictionary or key function to interpolate"
    _interpolate template, func, opts
  else
    template

module.exports = interpolate