import crypto from 'crypto';
import stringify from 'json-stable-stringify';
import check from './check';
import fs from './fs';

export default {
  jsonStableHash(obj) {
    if (!check(obj, 'Object')) {
      throw new Error(`jsonStableHash expects an obj | got: ${obj}`);
    }
    return crypto
      .createHash('md5')
      .update(stringify(obj))
      .digest('hex');
  },
  stringHash(string) {
    if (!check(string, 'String')) {
      throw new Error(`stringHash expects a string | got: ${string}`);
    }
    return crypto
      .createHash('md5')
      .update(string)
      .digest('hex');
  },
  fileHash(filePath) {
    return new Promise((resolve) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);
      stream.on('data', data => hash.update(data, 'utf8'));
      return stream.on('end', () => resolve(hash.digest('hex')));
    });
  }
};
