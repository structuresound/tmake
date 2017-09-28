import * as yaml from 'js-yaml';
import * as path from 'path';
import { readFileSync } from 'fs';
import { extend } from 'typed-json-transform';
import { initialize } from '../lib/settings';
import { get } from '../lib/fetch';

const _settings: Settings = <any>{ private: {} };

if (process.env.NAMESPACE_SETTINGS_PATH) {
  try {
    const ns = yaml.load(readFileSync(process.env.NAMESPACE_SETTINGS_PATH, 'utf8'));
    extend(_settings.private, ns.private);
    extend(_settings, ns.public);
  }
  catch (error) {
    console.log(`error reading namespace from file ${process.env.NAMESPACE_SETTINGS_PATH}`, error);
  }
}

if (process.env.NAMESPACE_SETTINGS) {
  try {
    const ns = yaml.load(process.env.NAMESPACE_SETTINGS);
    extend(_settings.private, ns.private);
    extend(_settings, ns.public);
  }
  catch (error) {
    console.log(`error reading namespace from environment ${process.env.NAMESPACE_SETTINGS}`, error);
  }
}

if (process.env.SETTINGS) {
  try {
    extend(_settings, yaml.load(process.env.SETTINGS));
    console.log(`loaded settings from env.SETTINGS`);
  }
  catch (error) {
    console.log(`error reading settings from env ${process.env.SETTINGS}`, error);
  }
}
else {
  const settingsPath = path.join(process.cwd(), process.env['SETTINGS_PATH'] || 'settings/settings.yaml');

  try {

    extend(_settings, yaml.load(readFileSync(settingsPath, 'utf8')));
    console.log(`loaded settings @ ${settingsPath}`);
  }
  catch (error) {
    console.log(`error reading settings from file ${settingsPath}`, error);
  }
}

_settings.version = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')).version;

if (_settings.env) {
  throw new Error("don't provide env to SETTINGS or settings.yaml, it should be computed at launch");
}

const transport = _settings.private.express.https ? 'https' : 'http';

_settings.env = {
  production: process.env.NODE_ENV === "production" ? true : false,
  debug: process.env.NODE_ENV === "production" ? false : true,
  absoluteUrl: `${transport}://${_settings.private.express.domain}`
};

if (!_settings.ssr) {
  _settings.ssr = {};
}

if (!_settings.webpack) {
  _settings.webpack = {}
}

if (!_settings.manifest) {
  _settings.manifest = { active: { theme: 'dark' } }
}

if (!_settings.manifest.bundle) _settings.manifest.bundle = {};

let themeUrl: string;

if (process.env.NODE_ENV === "production") {
  _settings.private.express.https = true;
  const bundleManifest = JSON.parse(readFileSync(`${process.cwd()}/front/bundle.json`, 'utf8'));
  for (const k of Object.keys(bundleManifest)) {
    _settings.manifest.bundle[k] = '/front/' + bundleManifest[k];
  }
  themeUrl = 'http://theme/theme/theme.json';
} else {
  _settings.manifest.bundle['bundle.js'] = '/front/bundle.js';
  _settings.manifest.bundle['bundle.css'] = '/front/bundle.css';
  themeUrl = 'http://10.200.10.1:3002/theme.json';
}

if (!_settings.manifest.theme) _settings.manifest.theme = {};

export const settings = initialize(_settings, true);

function fetchTheme() {
  get({ url: themeUrl }).then((res: any) => {
    if (res.status >= 200 && res.status < 300) {
      res.json().then((bundleManifest: { [index: string]: string }) => {
        // console.log('fetched theme manifest', bundleManifest);
        for (const k of Object.keys(bundleManifest)) {
          settings.manifest.theme[k] = '/theme/' + bundleManifest[k];
        }
        settings.manifest.theme.cssBundle = '/theme/' + bundleManifest[settings.manifest.active.theme + '.css']
      })
    }
  }, (error: Error) => {
    console.log('fetched failed', error.message);
  });
}

fetchTheme();
setInterval(fetchTheme, 5000);
