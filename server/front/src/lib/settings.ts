import * as yaml from 'js-yaml';
import { extend, setValueForKeyPath } from 'typed-json-transform';

const publicKeys = { MONGO_URL: 'mongo.uri', PORT: 'server.port' }

const privateKeys = {
  CREATESEND_KEY: 'createSend.key'
}

export const settings: Settings = <any>{};

export function initialize(_settings: Settings, isServer?: boolean) {
  extend(settings, _settings);

  if (isServer) {
    settings.env.isClient = false;
    settings.env.isServer = true;

    for (const key of Object.keys(publicKeys)) {
      if (process.env[key]) {
        setValueForKeyPath(process.env[key], (<any>publicKeys)[key], settings);
      }
    }
    for (const key of Object.keys(privateKeys)) {
      if (process.env[key]) {
        setValueForKeyPath(process.env[key], `private.${(<any>privateKeys)[key]}`, settings);
      }
    }
  }
  return settings;
}