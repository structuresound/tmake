import * as through from 'through';
import { compress, decompress } from 'lzma';

function skipLeadingZeroes(buffer) {
  let i;
  for (i = 0; i < buffer.length; i++) {
    if (buffer[i] !== 0x00)
      break;
  }
  return buffer.slice(i);
}

export function unxz() {
  let beginning = 1;
  return through(function write(data) {
    if (beginning) {
      beginning = 0;
      decompress(skipLeadingZeroes(data), (result, error) => {
        console.log('beginning', data, 'o:', result, error);
        this.queue(result);
      });
    } else {
      decompress(data, (result, error) => {
        console.log('o:', result, error);
        this.queue(result);
      });
    }
  });
}

export function xz(level = 1) {
  return through(function write(data) {
    compress(data, level, (result) => {
      this.queue(result)
    });
  });
}