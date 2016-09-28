_ = require 'underscore'
fs = require '../fs'

jsonToCFlags = (options) ->
  jsonToCxxFlags _.omit options, ['std','stdlib']

jsonToCxxFlags = (options) ->
  opt = _.clone options
  if opt.O
    switch opt.O
      when 3, "3" then options.O3 = true
      when 2, "2" then options.O2 = true
      when 1, "1" then options.O1 = true
      when 0, "0" then options.O0 = true
      when "s" then options.Os = true
    delete opt.O
  if options.O3
    delete opt.O2
  if opt.O3 or opt.O2
    delete opt.O1
  if opt.O3 or opt.O2 or opt.O1
    delete options.Os
  if opt.O3 or opt.O2 or opt.O1 or opt.Os
    delete opt.O0

  jsonToFlags opt

jsonToFrameworks = (opt) ->
  flags = []
  for i of opt
    if opt[i]
      if fs.existsSync "/System/Library/Frameworks/#{i}.framework"
        flags.push "/System/Library/Frameworks/#{i}.framework/#{i}"
      else throw new Error "can't find framework #{i}.framework in /System/Library/Frameworks"
  flags

jsonToLDFlags = (options) ->
  jsonToFlags options

isNumeric = (n) ->
  !isNaN(parseFloat(n)) and isFinite(n)

_jsonToFlags = (prefix, json) ->
  flags = []
  _.each json, (opt, key) ->
    if opt
      if (typeof opt == 'string') || isNumeric(opt)
        flags.push "#{prefix}#{key}=#{opt}"
      else
        flags.push "#{prefix}#{key}"
  if flags.length then flags
  else undefined

jsonToFlags = (json) ->
  _jsonToFlags '-', json

module.exports =
  parse: jsonToFlags
  parseLD: jsonToLDFlags
  parseFrameworks: jsonToFrameworks
  parseCXX: jsonToCxxFlags
  parseC: jsonToCFlags
