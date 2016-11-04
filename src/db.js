import Datastore from 'nedb-promise';
import argv from './util/argv';

const cache = new Datastore({ filename: `${argv.runDir}/${argv.cachePath}/.db`, autoload: true });
const localRepo = new Datastore({ filename: `${argv.userCache}/packages.db`, autoload: true });
const settings = new Datastore({ filename: `${argv.userCache}/cli.db`, autoload: true });

export {
  cache, localRepo, settings
};
