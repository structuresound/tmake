import path from 'path';
import yaml from 'js-yaml';
import {check} from './util/check';
import fs from './util/fs';
import log from './util/log';
import argv from './util/argv';
import cli from './cli';
import tmake from './tmake';

function init() {
  if (!fs.findConfigAsync(argv.runDir)) {
    return cli.createPackage()
    .then(config => fs.writeFileSync(`${argv.runDir}/tmake.yaml`, yaml.dump(config)));
  }
  return log.quiet('aborting init, this folder already has a package file present');
}

export default {
  run() {
    return fs.readConfigAsync(argv.runDir)
    .then((config) => {
      if (check(config, Error)) { throw config; }
      if (argv._[0] == null) { argv._[0] = 'all'; }
      if (config) {
        cli.parse(argv);
        return tmake.run(config, cli);
      }
      const example = argv._[1] || 'served';
      const examplePath = path.join(argv.npmDir, `examples/${example}`);
      const targetFolder = argv._[2] || example;

      switch (argv._[0]) {
        case 'init':
          return init();
        case 'example':
          log.quiet(`copy from ${example} to ${targetFolder}`, 'magenta');
          return fs.src(['**/*'], { cwd: examplePath })
          .pipe(fs.dest(path.join(argv.runDir, targetFolder)));
        case 'help': case 'man': case 'manual': return log.info(cli.manual());
        default:
          return log.info(cli.hello());
      }
    });
  }
};
