import * as Bluebird from 'bluebird';
import * as util from 'util';
import { log } from './log';
import { args } from './args';

interface Prompt {
  done: Function;
  prompt: Function;
  message: string;
  start: Function;
  yes: boolean;
  onReceived: Function;
  ask: Function;
}

const prompt: Prompt = <Prompt>{};
prompt.done = () => {
  return process
    .stdin
    .pause();
};
prompt.prompt = () => {
  return process
    .stdout
    .write(prompt.message);
};
prompt.message = '?:';
prompt.start = () => {
  process
    .stdin
    .resume();
  process
    .stdin
    .setEncoding('utf8');
  process
    .stdin
    .on('data', (text: string) => {
      return prompt.onReceived(text);
    });
  return prompt.prompt();
};
prompt.onReceived = (text: string) => {
  log.verbose(`received data: ${text} ${util.inspect(text)}`);
};
prompt.yes = args.y || args.yes;
prompt.ask = (q: string, expect: any, skip: boolean) => {
  if (prompt.yes || skip) {
    return Promise.resolve(expect || 'y');
  }
  return new Promise((resolve) => {
    prompt.message = `${q}: `;
    prompt.onReceived = (data: any) => {
      const noLines = data.replace(/\r?\n|\r/g, ' ');
      const answer = noLines.trim();
      prompt.done();
      if (expect) {
        if (answer === expect) {
          return resolve(answer);
        }
      } else if (answer === 'y' || answer === 'yes' || prompt.yes) {
        return resolve(answer);
      }
      return resolve(false);
    };
    return prompt.start();
  });
};

export { Prompt, prompt }
