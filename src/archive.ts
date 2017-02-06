import * as fs from 'fs';
import * as path from 'path';
import * as Bluebird from 'bluebird';
import * as unzip from 'unzip';
import * as tar from 'tar-fs';
import * as lzma from 'lzma-native';
import gunzip = require('gunzip-maybe');
import * as readChunk from 'read-chunk';
import fileType = require('file-type');
import pstream = require('progress-stream');
import * as ProgressBar from 'progress';

const unxz = lzma.createDecompressor();

function unarchive(filePath: string, toDir: string) {
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

  const str = pstream({ length: stat.size, time: 100 });
  str.on('progress', (p: any) => progressBar.tick(p.transferred));

  return new Promise<any>((resolve, reject) => {
    const finish = (result: any) => resolve(result);
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
        .pipe(unzip.Extract({ path: toDir }))
        .on('close', finish)
        .on('error', reject);
    } else if (fileExt === 'gz') {
      return stream
        .pipe(gunzip())
        .pipe(tar.extract(toDir))
        .on('progress', (p: string) => console.log(p))
        .on('finish', finish)
        .on('close', finish)
        .on('end', finish)
        .on('error', reject);
    } else if (fileExt === 'xz') {
      return stream
        .pipe(unxz)
        .pipe(tar.extract(toDir))
        .on('progress', (p: string) => console.log(p))
        .on('finish', finish)
        .on('close', finish)
        .on('end', finish)
        .on('error', reject);
    }
    return reject(`file is unknown archive type ${fileExt}`);
  });
}

export default unarchive;
