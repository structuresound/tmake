Datastore = require('nedb-promise').datastore

module.exports = (rootDir) ->
  collection = (name) -> new Datastore
    filename: rootDir + "/.bbt/db/#{name}.db"
    autoload: true

  deps: collection 'deps'
