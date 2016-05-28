_ = require('underscore')

isNumeric = (val) -> !isNaN(parseFloat(val)) && isFinite(val)
_c = (val, type) ->
  switch type
    when String, "String" then typeof val == 'string' && !isNumeric(val)
    when Number, "Number" then isNumeric val
    when Array, "Array" then Array.isArray val
    when Function, "Function" then _.isFunction val
    when Object, "Object" then val != null and typeof val == 'object'
    when "Boolean" then typeof val == 'boolean'
    when undefined, "Undefined" then val == undefined
    else throw "checking unsupported type " + type

_check = (val, type) ->
  if _c type, "Array"
    _.any type, (sType) -> _c(val, sType)
  else _c val, type

module.exports = (val, type) -> _check val, type
