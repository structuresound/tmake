Datastore = require('nedb')
Promise = require 'bluebird'

module.exports = (rootDir) ->
  newCollection: (name) ->
    db = new Datastore
      filename: rootDir + "/.bbt/db/#{name}.db"
      autoload: true
    Promise.promisifyAll db
