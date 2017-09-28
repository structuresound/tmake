/// <reference path="../../../shared/interfaces/index.d.ts" />

import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import * as path from 'path';

import { extend, setValueForKeyPath } from 'typed-json-transform';

const envMap: { [index: string]: string } = {
    HOST: 'express.host',
    PORT: 'express.port'
}

interface PrivateSettings extends TMake.Settings.Shared.Private {
    express: TMake.Settings.Server
}

interface Settings extends TMake.Settings.Shared.Public {
    private: PrivateSettings
    version: string
}

export const settings = <Settings>{ private: {} };

if (process.env.NAMESPACE_SETTINGS_PATH) {
    try {
        const ns = yaml.load(readFileSync(process.env.NAMESPACE_SETTINGS_PATH, 'utf8'));
        extend(settings.private, ns.private);
        extend(settings, ns.public);
    }
    catch (error) {
        console.log(`error reading settings string ${process.env.NAMESPACE_SETTINGS_PATH}`, error);
    }
}

if (process.env.NAMESPACE_SETTINGS) {
    try {
        const ns = yaml.load(process.env.NAMESPACE_SETTINGS);
        extend(settings.private, ns.private);
        extend(settings, ns.public);
    }
    catch (error) {
        console.log(`error reading settings string ${process.env.NAMESPACE_SETTINGS}`, error);
    }
}

if (process.env.SETTINGS) {
    try {
        extend(settings, yaml.load(process.env.SETTINGS));
        console.log(`loaded settings from env.SETTINGS`);
    }
    catch (error) {
        console.log(`error reading settings string ${process.env.SETTINGS}`, error);
    }
}
else {
    const settingsPath = process.env.SETTINGS_PATH || 'settings/local.yaml';
    try {
        extend(settings, yaml.load(readFileSync(settingsPath, 'utf8')));
    } catch (e) {
        console.log('error reading settings file @', process.cwd() + '/' + settingsPath);
        console.log(e.message);
    }

}

for (const key of Object.keys(envMap)) {
    if (process.env[key]) {
        setValueForKeyPath(process.env[key], envMap[key], settings);
        // console.log(`override setting ${key}: ${process.env[key]}`);
    }
}

const packagePath = path.join(__dirname, '../../package.json')

try {
    settings.version = JSON.parse(readFileSync(packagePath, 'utf8')).version;
} catch (e) {
    console.log('error reading package file @', packagePath);
    console.log(e.message);
}