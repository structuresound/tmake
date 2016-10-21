fs = require('fs')
Promise = require("bluebird")
unzip = require('unzip')
tar = require('tar-fs')
lzma = require('lzma-native')
gunzip = require('gunzip-maybe')

unxz = lzma.createDecompressor()
path = require('path')


readChunk = require('read-chunk')
fileType = require('file-type')
pstream = require('progress-stream')
ProgressBar = require('progress')

module.exports =
  unarchive: (filePath, toDir) ->
    throw new Error "unarchive: no path given" unless filePath
    throw new Error "unarchive: no destination given" unless toDir
    stat = fs.statSync(filePath)

    progressBar = new ProgressBar("unarchiving [:bar] :percent :etas #{path.parse(filePath).name} -> #{toDir}",
      complete: '='
      incomplete: ' '
      width: 20
      total: stat.size)

    str = pstream(
      length: stat.size
      time: 100)
    str.on 'progress', (p) ->
      progressBar.tick(p.transferred)
      ###
      {
          percentage: 9.05,
          transferred: 949624,
          length: 10485760,
          remaining: 9536136,
          eta: 42,
          runtime: 3,
          delta: 295396,
          speed: 949624
      }
      ###

    new Promise (resolve, reject) ->
      finish = (result) ->
        resolve(result)

      buffer = readChunk.sync(filePath, 0, 262)
      archiveType = fileType(buffer)
      throw new Error "no filetype detected for file #{filePath}" unless archiveType
      fileExt = archiveType.ext
      stream = fs.createReadStream(filePath).pipe(str)
      if fileExt == 'zip'
        stream.pipe unzip.Extract(path: toDir)
        .on 'close', finish
        .on 'error', reject
      else if fileExt == 'gz'
        stream.pipe gunzip()
        .pipe tar.extract(toDir)
        .on 'progress', (p) -> console.log p
        .on 'finish', finish
        .on 'close', finish
        .on 'end', finish
        .on 'error', reject
      else if fileExt == 'xz'
        stream.pipe unxz
        .pipe tar.extract(toDir)
        .on 'progress', (p) -> console.log p
        .on 'finish', finish
        .on 'close', finish
        .on 'end', finish
        .on 'error', reject
      else
        reject "file is unknown archive type #{fileExt}"
