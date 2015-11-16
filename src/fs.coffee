Promise = require("bluebird")
fs = Promise.promisifyAll(require('fs'))

module.exports = (->
  fs.deleteFolderRecursive = (path) ->
    files = []
    if fs.existsSync(path)
      files = fs.readdirSync(path)
      files.forEach (file) ->
        curPath = path + '/' + file
        if fs.lstatSync(curPath).isDirectory()
          fs.deleteFolderRecursive curPath
        else
          fs.unlinkSync curPath
      fs.rmdirSync path
  fs
)()
