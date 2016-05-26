os = require('os')

module.exports = (->
  platformName =
    linux: "linux"
    darwin: "mac"
    win: "win"
    win32: "win"

  macros =
    OS_ENDIANNESS: os.endianness()

  homeDir: -> process.env[if process.platform == 'win32' then 'USERPROFILE' else 'HOME']
  name: -> platformName[os.platform()]
  keywords: -> ["linux", "mac", "win", "x86", "x64", "arm"]
  j: -> os.cpus().length
  macros: macros
)()
