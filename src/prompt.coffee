colors = require ('chalk')
Promise = require("bluebird")
util = require('util')

module.exports = (->
  that = {}
  that.done = -> process.stdin.pause()
  that.prompt = -> process.stdout.write that.message
  that.message = "?:"
  that.start = ->
    process.stdin.resume()
    process.stdin.setEncoding 'utf8'
    process.stdin.on 'data', (text) -> that.onReceived text
    that.prompt()
  that.onReceived = (text) -> console.log 'received data:', text, util.inspect(text)
  that.yes = false
  that.ask = (q, a) ->
    new Promise (resolve) ->
      that.message = colors.yellow(q) + ': '
      that.onReceived = (data) ->
        that.done()
        if a
          if data == (a + '\n') then return resolve true
        else if data == 'y\n' or data == 'yes\n' or that.yes then return resolve true
        resolve false
      that.start()
)()
