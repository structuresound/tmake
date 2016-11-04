import sh from 'shelljs';
import log from './log';

sh.Promise = function shPromise(command, cwd, verbose) {
  if (!command) {
    throw new Error('no command');
  }
  if (verbose) {
    log.quiet(`[ sh ] ${command}`);
  }
  return new Promise((resolve, reject) => {
    sh.cd(cwd);
    return sh.exec(command, (code, stdout, stderr) => {
      if (code) {
        return reject(new Error(`${command} exited with code ${code} \n ${command}`));
      } else if (stdout) {
        return resolve(stdout);
      } else if (stderr) {
        return resolve(stderr);
      }
      return resolve();
    });
  });
};

sh.get = function shGet(command, verbose) {
  sh.exec(command, {
    silent: !verbose
  })
    .stdout
    .replace('\n', '');
};

export default sh;
