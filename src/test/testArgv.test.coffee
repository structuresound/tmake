path = require('path')

npmDir = process.cwd()
runDir = path.join npmDir, 'tests'
cacheDir = path.join npmDir, 'tests_cache'
binDir = path.join npmDir, 'bin'

module.exports =
  npmDir: npmDir
  runDir: runDir
  binDir: binDir
  userCache: cacheDir
  cachePath: "trie_modules"
  pgname: "tmake"
  quiet: true
  verbose: false
  test: true
  yes: true
  _: []
