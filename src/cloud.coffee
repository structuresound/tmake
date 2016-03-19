request = require('request-promise')
_p = require("bluebird")

apiVer = 'v1'
server = 'localhost'
port = '3000'

module.exports = (settings) ->
  push: (json) ->
    options =
      method: 'POST'
      uri: "https://#{server}:#{port}/#{apiVer}/packages/create"
      body: json
      json: true

  login: (user,password,email) ->
    settings.insert 'user', $set:
      username: user
      email: email
      password: password
