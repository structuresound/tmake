os = require('os')

module.exports = (->
  platformName =
    linux: "linux"
    darwin: "mac"
    win: "win"
    win32: "win"

  name: -> platformName[os.platform()]
  j: -> os.cpus().length
)()
