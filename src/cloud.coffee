request = require('request-promise')
_p = require("bluebird")
colors = require('chalk')

module.exports = (argv, db, prompt) ->
  apiVer = 'v1'
  server = 'http://localhost:3000'

  login = ->
    _p.resolve console.log 'loggin in'

  post: (json) ->
    console.log colors.magenta "#{json.name} >> #{server}"
    options =
      method: 'POST'
      uri: "#{server}/api/#{apiVer}/packages"
      body: json
      json: true
    request options

  get: (_id) ->
    options =
      uri: "#{server}/api/#{apiVer}/packages/#{_id}"
      headers: 'User-Agent': 'Request-Promise'
      json: true
    request options

  login: ->
    db.findOne 'user'
    .then (record) ->
      if record then login record
      else
        user = {}
        prompt.ask colors.magenta "user name or email"
        .then (res) ->
          user.userame = res
          prompt.ask colors.magenta "password"
        .then (res) ->
          user.password = res
          db.update 'user', {$set: user}, {upsert: true}
        .then ->
          login user
