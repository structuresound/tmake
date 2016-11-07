import Datastore from 'nedb-promise';
import argv from './util/argv';

let _cache;
let _settings;

if (process.env.NODE_ENV === 'test' || process.env.LOADED_MOCHA_OPTS) {
  _cache = new Datastore();
  _settings = new Datastore();
} else {
  _cache = new Datastore({filename: `${argv.runDir}/${argv.cachePath}/.db`, autoload: true});
  _settings = new Datastore({filename: `${argv.userCache}/cli.db`, autoload: true});
}
const localRepo = new Datastore({filename: `${argv.userCache}/packages.db`, autoload: true});

const cache = _cache;
const settings = _settings;

export {cache, localRepo, settings};
