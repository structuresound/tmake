colors = require ('chalk')
Promise = require("bluebird")
util = require('util')

module.exports = (argv) ->
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
  that.yes = argv.y || argv.yes
  that.ask = (q, expect) ->
    if that.yes then return Promise.resolve expect || 'y'
    new Promise (resolve) ->
      that.message = colors.yellow(q) + ': '
      that.onReceived = (data) ->
        noLines = data.replace(/\r?\n|\r/g, " ")
        answer = noLines.trim()
        that.done()
        if expect
          if answer == expect then return resolve answer
        else if answer == 'y' or answer == 'yes' or that.yes then return resolve answer
        resolve false
      that.start()
  that
