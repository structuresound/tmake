"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var Bluebird = require("bluebird");
var unzip = require("unzip");
var tar = require("tar-fs");
var ProgressBar = require("progress");
var gunzip = require("gunzip-maybe");
var bz2 = require("unbzip2-stream");
var readChunk = require("read-chunk");
var fileType = require("file-type");
var pstream = require("progress-stream");
// import { unxz } from './lzma-stream';
var lzma_native_1 = require("lzma-native");
// const packageJson = {
//   "tar-fs": "^1.13.0",
//   "gunzip-maybe": "^1.3.1",
//   "lzma": "^2.3.2",
//   "lzma-native": "^2.0.1",
//   "unbzip2-stream": "^1.0.10",
//   "unzip": "^0.1.11",
//   "through": "^2.3.8",
// }
// import decompress = require('decompress');
// export default decompress;
function unarchive(filePath, toDir) {
    if (!filePath) {
        throw new Error('unarchive: no path given');
    }
    if (!toDir) {
        throw new Error('unarchive: no destination given');
    }
    var stat = fs.statSync(filePath);
    var progressBar = new ProgressBar("unarchiving [:bar] :percent :etas " + path.parse(filePath).name + " -> " + toDir, {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: stat.size * 3
    });
    var str = pstream({ length: stat.size, time: 100 });
    str.on('progress', function (p) { return progressBar.tick(p.transferred); });
    return new Bluebird(function (resolve, reject) {
        var finish = function (result) { return resolve(result); };
        var buffer = readChunk.sync(filePath, 0, 262);
        var archiveType = fileType(buffer);
        if (!archiveType) {
            throw new Error("no filetype detected for file " + filePath);
        }
        var fileExt = archiveType.ext;
        var stream = fs
            .createReadStream(filePath)
            .pipe(str);
        if (fileExt === 'zip') {
            return stream
                .pipe(unzip.Extract({ path: toDir }))
                .on('close', finish)
                .on('error', reject);
        }
        else if (fileExt === 'gz') {
            return stream
                .pipe(gunzip())
                .pipe(tar.extract(toDir))
                .on('progress', function (p) { return console.log(p); })
                .on('finish', finish)
                .on('close', finish)
                .on('end', finish)
                .on('error', reject);
        }
        else if (fileExt === 'bz2') {
            return stream
                .pipe(bz2())
                .pipe(tar.extract(toDir))
                .on('progress', function (p) { return console.log(p); })
                .on('finish', finish)
                .on('close', finish)
                .on('end', finish)
                .on('error', reject);
        }
        else if (fileExt === 'xz') {
            return stream
                .pipe(lzma_native_1.createDecompressor())
                .pipe(tar.extract(toDir))
                .on('progress', function (p) { return console.log(p); })
                .on('finish', finish)
                .on('close', finish)
                .on('end', finish)
                .on('error', reject);
        }
        return reject("file is unknown archive type " + fileExt);
    });
}
exports.default = unarchive;
