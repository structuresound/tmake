Datastore = require('nedb-promise')
Promise = require 'bluebird'

module.exports = (rootDir) ->
  name = "packages"
  new Datastore
    filename: rootDir + "/.bbt/db/#{name}.db"
    autoload: true
