import fs from 'fs';
import Promise from 'bluebird';
import unzip from 'unzip';
import tar from 'tar-fs';
import lzma from 'lzma-native';
import gunzip from 'gunzip-maybe';
import path from 'path';
import readChunk from 'read-chunk';
import fileType from 'file-type';
import pstream from 'progress-stream';
import ProgressBar from 'progress';

const unxz = lzma.createDecompressor();

function unarchive(filePath, toDir) {
  if (!filePath) {
    throw new Error('unarchive: no path given');
  }
  if (!toDir) {
    throw new Error('unarchive: no destination given');
  }
  const stat = fs.statSync(filePath);

  const progressBar = new ProgressBar(`unarchiving [:bar] :percent :etas ${path.parse(filePath).name} -> ${toDir}`, {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: stat.size
  });

  const str = pstream({length: stat.size, time: 100});
  str.on('progress', p => progressBar.tick(p.transferred));

  return new Promise((resolve, reject) => {
    const finish = result => resolve(result);
    const buffer = readChunk.sync(filePath, 0, 262);
    const archiveType = fileType(buffer);
    if (!archiveType) {
      throw new Error(`no filetype detected for file ${filePath}`);
    }
    const fileExt = archiveType.ext;
    const stream = fs
      .createReadStream(filePath)
      .pipe(str);
    if (fileExt === 'zip') {
      return stream
        .pipe(unzip.Extract({path: toDir}))
        .on('close', finish)
        .on('error', reject);
    } else if (fileExt === 'gz') {
      return stream
        .pipe(gunzip())
        .pipe(tar.extract(toDir))
        .on('progress', p => console.log(p))
        .on('finish', finish)
        .on('close', finish)
        .on('end', finish)
        .on('error', reject);
    } else if (fileExt === 'xz') {
      return stream
        .pipe(unxz)
        .pipe(tar.extract(toDir))
        .on('progress', p => console.log(p))
        .on('finish', finish)
        .on('close', finish)
        .on('end', finish)
        .on('error', reject);
    }
    return reject(`file is unknown archive type ${fileExt}`);
  });
}

export default unarchive;
