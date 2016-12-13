import Promise from 'bluebird';
import util from 'util';
import log from './util/log';
import args from './util/args';

const that = {};
that.done = () => {
  return process
    .stdin
    .pause();
};
that.prompt = () => {
  return process
    .stdout
    .write(that.message);
};
that.message = '?:';
that.start = () => {
  process
    .stdin
    .resume();
  process
    .stdin
    .setEncoding('utf8');
  process
    .stdin
    .on('data', text => {
      return that.onReceived(text);
    });
  return that.prompt();
};
that.onReceived = text => {
  log.verbose(`received data: ${text} ${util.inspect(text)}`);
};
that.yes = args.y || args.yes;
that.ask = (q, expect, skip) => {
  if (that.yes || skip) {
    return Promise.resolve(expect || 'y');
  }
  return new Promise((resolve) => {
    that.message = `${q}: `;
    that.onReceived = (data) => {
      const noLines = data.replace(/\r?\n|\r/g, ' ');
      const answer = noLines.trim();
      that.done();
      if (expect) {
        if (answer === expect) {
          return resolve(answer);
        }
      } else if (answer === 'y' || answer === 'yes' || that.yes) {
        return resolve(answer);
      }
      return resolve(false);
    };
    return that.start();
  });
};

export default that;
