import * as crypto from 'crypto';
import * as fs from 'fs';
import stringify = require('json-stable-stringify');
import { check } from 'js-object-tools';

export function jsonStableHash(obj: any) {
  if (!check(obj, 'Object')) {
    throw new Error(`jsonStableHash expects an obj | got: ${obj}`);
  }
  const canonical = stringify(obj);
  return crypto
    .createHash('md5')
    .update(canonical)
    .digest('hex');
}

export function stringHash(string: string) {
  if (!check(string, 'String')) {
    throw new Error(`stringHash expects a string | got: ${string}`);
  }
  return crypto
    .createHash('md5')
    .update(string)
    .digest('hex');
}

export function fileHash(filePath: string) {
  return new Promise<string>((resolve) => {
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