check = require '../util/check'

module.exports = (val) ->
  if check(val, Array) then val
  else [ val ]
