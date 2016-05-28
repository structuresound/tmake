os = require('os')

module.exports = (->
  platformName =
    linux: "linux"
    darwin: "mac"
    win: "win"
    win32: "win"

  architecture =
    x86: "x86"
    x32: "x86"
    x64: "x64"
    arm: "arm"

  macros =
    OS_ENDIANNESS: os.endianness()

  homeDir: -> process.env[if process.platform == 'win32' then 'USERPROFILE' else 'HOME']
  name: -> platformName[os.platform()]
  keywords: -> ["linux", "mac", "win", "x86", "x64", "arm"]
  selectors: -> [
    platformName[os.platform()]
    architecture[process.arch]
  ]
  j: -> os.cpus().length
  macros: macros
)()
