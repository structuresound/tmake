###*
 port of http://www.bbc.co.uk/glow/docs/1.7/api/glow.lang.shtml #interpolate
  Modified to be stand-alone and offer support for delimters of random length
  @description Replaces placeholders in a string with data from an object
  @param {String} template The string containing {placeholders}
  @param {Object} data Object containing the data to be merged in to the template
    The object can contain nested data objects and arrays, with nested object properties and array elements are accessed using dot notation. eg foo.bar or foo.0.
    The data labels in the object cannot contain characters used in the template delimiters, so if the data must be allowed to contain the default { and } delimiters, the delimters must be changed using the option below.
  @param {Object} opts Options object
    @param {String} [opts.delimiter="{}"] Alternative label delimiter(s) for the template. Needs to be symmetric, i.e. '{{}}', '<%%>'
  @returns {String}
###

_ = require 'underscore'
check = require './check'

defaultLookup = (key, data) ->
  keyParts = key.split('.')
  val = undefined
  i = 0
  len = keyParts.length
  if key of data
    # need to be backwards compatible with "flattened" data.
    return data[key]
  else
    # look up the chain
    val = data
    while i < len
      if keyParts[i] of val
        val = val[keyParts[i]]
      i++
    val

_interpolate = (template, func) ->
  commands = template.match(/{[^}\r\n]*}/g)
  if commands
    if commands[0].length == template.length
      func commands[0].slice(1, -1)
    else
      interpolated = template
      _.each commands, (c) ->
        interpolated = interpolated.replace c, func c.slice(1, -1)
      _interpolate interpolated, func
  else template

interpolate = (template, funcOrData, opts) ->
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
