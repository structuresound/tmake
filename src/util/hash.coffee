crypto = require('crypto')
stringify = require 'json-stable-stringify'
check = require './check'
fs = require './fs'

module.exports =
  jsonStableHash: (obj) ->
    throw new Error "jsonStableHash expects an obj | got: #{obj}" unless check(obj, "Object")
    crypto.createHash('md5').update(stringify(obj)).digest("hex");
  stringHash: (string) ->
    throw new Error "stringHash expects a string | got: #{string}" unless check(string, "String")
    crypto.createHash('md5').update(string).digest("hex");
  fileHash: (filePath) ->
    new Promise (resolve) ->
      hash = crypto.createHash('md5')
      stream = fs.createReadStream(filePath)
      stream.on 'data', (data) ->
        hash.update data, 'utf8'
      stream.on 'end', ->
        resolve hash.digest 'hex'
