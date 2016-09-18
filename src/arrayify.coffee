check = require './check'

module.exports = (val) ->
  if check(val, Array) then val
  else [ val ]
