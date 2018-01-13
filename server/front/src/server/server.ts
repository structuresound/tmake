import * as path from 'path';
import * as express from 'express';

import { settings } from './settings';
import { integrate } from './integrate';

import { init as initRoutes } from './routes';

import { render, fetchCookieUser } from './render/middleware';

import * as session from 'express-session';
import * as cors from 'cors';
import * as methodOverride from 'method-override';
import * as gzip from 'compression';
import * as helmet from 'helmet';
import * as httpProxy from 'http-proxy';

import { s3domain } from '../lib/assets';


import cookieParser = require('cookie-parser')

export function init() {
    const app = express();

    app.set('port', settings.private.express.port);

    if (settings.env.production) {
        app.use(gzip());
    };

    app.use(cors({
        "origin": "*",
        "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
        "preflightContinue": false
    }));

    const bucket = `https://${settings.assets.s3.bucket}.${s3domain(settings.assets.s3.region)}`
    const cspDirectives = {
        defaultSrc: ["'self'", `https://${settings.url}`, 'https://chroma-fund.s3.amazonaws.com', bucket],
        styleSrc: ["'self' 'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        scriptSrc: ["'self' 'unsafe-inline'", 'https://www.google-analytics.com'],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', bucket, 'https://www.google-analytics.com', 'https://stats.g.doubleclick.net', 'https://travis-ci.org', 'https://api.travis-ci.org']
    }

    if (settings.env.production) {
        cspDirectives.connectSrc.push(`https://${settings.url}`);
    }
    else {
        cspDirectives.connectSrc.push(`wss://${settings.url}`);
    }

    app.use(helmet());

    app.use(helmet.contentSecurityPolicy({
        directives: cspDirectives
    }))

    if (settings.env.production) {
        const bundleDir = path.join(process.cwd(), 'front');
        app.use('/front', express.static(bundleDir, { fallthrough: true }));
        console.log(`===>  Serving client bundle from ${bundleDir}`)
    }

    app.use(cookieParser())
    app.use(methodOverride());
    app.use(require('express-device').capture());

    initRoutes(app);

    app.use(fetchCookieUser);
    app.get('*', render);
    app.listen(app.get('port'));

    console.log(`--------------------------
===> 😊  Started Server . . .
===>  Environment: ${JSON.stringify(settings.env)}
===>  Listening on port: ${app.get('port')}`);
    if (settings.env.production) {
        console.log(
            '===> 🚦  Note: In order for authentication to work in production');
        console.log('===>           you will need a secure HTTPS connection');
    }
    console.log('--------------------------');

    integrate();
};

init();