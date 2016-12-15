import * as crypto from 'crypto';
import * as fs from 'fs';
import {check, diff} from 'js-object-tools';

function jsonStableHash(obj: Object) {
  if (!check(obj, 'Object')) {
    throw new Error(`jsonStableHash expects an obj | got: ${obj}`);
  }
  return crypto
    .createHash('md5')
    .update(diff.stringify(obj))
    .digest('hex');
}

function stringHash(string: string) {
  if (!check(string, 'String')) {
    throw new Error(`stringHash expects a string | got: ${string}`);
  }
  return crypto
    .createHash('md5')
    .update(string)
    .digest('hex');
}

function fileHash(filePath: string) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data: any) => {
      return hash.update(data, 'utf8');
    });
    stream.on('end', () => {
      return resolve(hash.digest('hex'));
    });
  });
}

export {
  jsonStableHash,
  stringHash,
  fileHash
};
