import * as crypto from 'crypto';
import { existsSync, readFileSync, createReadStream } from 'fs';
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

export function fileHashSync(filePath: string) {
  if (existsSync(filePath)) {
    const contents = readFileSync(filePath, 'utf8');
    return stringHash(contents);
  }
  return Promise.resolve("");
}

export function fileHash(filePath: string) {
  if (existsSync(filePath)) {
    return new Promise<string>((resolve) => {
      const hash = crypto.createHash('md5');
      const stream = createReadStream(filePath);
      stream.on('data', (data: any) => {
        return hash.update(data, 'utf8');
      });
      stream.on('end', () => {
        return resolve(hash.digest('hex'));
      });
    });
  }
  return Promise.resolve("");
}