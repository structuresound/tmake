require '../util/string'
_ = require 'underscore'
fs = require '../util/fs'

jsonToCFlags = (object) ->
  opt = _.clone object
  if opt.O
    switch opt.O
      when 3, "3" then object.O3 = true
      when 2, "2" then object.O2 = true
      when 1, "1" then object.O1 = true
      when 0, "0" then object.O0 = true
      when "s" then object.Os = true
    delete opt.O
  if object.O3
    delete opt.O2
  if opt.O3 or opt.O2
    delete opt.O1
  if opt.O3 or opt.O2 or opt.O1
    delete object.Os
  if opt.O3 or opt.O2 or opt.O1 or opt.Os
    delete opt.O0
  jsonToFlags opt

jsonToFrameworks = (object) ->
  flags = []
  for i of object
    if object[i]
      if fs.existsSync "/System/Library/Frameworks/#{i}.framework"
        flags.push "/System/Library/Frameworks/#{i}.framework/#{i}"
      else throw new Error "can't find framework #{i}.framework in /System/Library/Frameworks"
  flags

isNumeric = (n) ->
  !isNaN(parseFloat(n)) and isFinite(n)

_jsonToFlags = (object, options) ->
  flags = []
  _.each object, (opt, key) ->
    if opt
      if (typeof opt == 'string') || isNumeric(opt)
        join = options.join
        if typeof opt == 'string'
          if opt.startsWith " " then join = ""
          if opt.startsWith "=" then join = ""
        if key.startsWith options.prefix then flags.push "#{key}#{join}#{opt}"
        else flags.push "#{options.prefix}#{key}#{join}#{opt}"
      else
        if key.startsWith options.prefix then flags.push "#{key}"
        else flags.push "#{options.prefix}#{key}"
  flags

jsonToFlags = (object, options) ->
  defaultOptions =
    prefix: '-'
    join: '='
  if options
    _.extend defaultOptions, options
  _jsonToFlags object, defaultOptions

module.exports =
  parse: jsonToFlags
  parseC: jsonToCFlags
  parseFrameworks: jsonToFrameworks
