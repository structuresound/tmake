module.exports = (->
  shell = require 'shelljs'
  shell.test = ->
    """
    if not which 'git'
      echo 'Sorry, this script requires git'
      exit 1

    # Copy files to release dir
    mkdir '-p', 'out/Release'
    cp '-R', 'stuff/*', 'out/Release'

    # Replace macros in each .js file
    cd 'lib'
    for file in ls '*.js'
      sed '-i', 'BUILD_VERSION', 'v0.1.2', file
      sed '-i', /.*REMOVE_THIS_LINE.*\n/, '', file
      sed '-i', /.*REPLACE_LINE_WITH_MACRO.*\n/, cat('macro.js'), file
    cd '..'

    # Run external tool synchronously
    if (exec 'git commit -am "Auto-commit"').code != 0
      echo 'Error: Git commit failed'
      exit 1
    """
  shell
)()
