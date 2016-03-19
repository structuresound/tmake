os = require('os')

module.exports = (->
  platformName =
    linux: "linux"
    darwin: "mac"
    win: "win"
    win32: "win"

  homeDir: -> process.env[if process.platform == 'win32' then 'USERPROFILE' else 'HOME']
  name: -> platformName[os.platform()]
  j: -> os.cpus().length
)()
