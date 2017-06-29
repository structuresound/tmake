import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { StaticRouter } from 'react-router';
import * as Helmet from 'react-helmet';

import { clone } from 'typed-json-transform';

import { scriptBundles, createTrackingScript } from './bundles';
import { settings as serverSettings } from '../../lib/settings';

import { createApp } from '../../ux/routes';

const settings = clone(serverSettings);
delete settings.private;
settings.env.isClient = true;
settings.env.isServer = false;

export function renderPage(store: Redux.Store<Object>, history: any, location: string, mq: TMake.MediaQueryProps, cookies: any) {
  settings.manifest = serverSettings.manifest;
  settings.ssr.loginTokenPresent = (cookies.login != null);
  settings.ssr.mq = mq;
  const initialState = store.getState();

  const App = createApp(history);
  try {
    const componentHTML = renderToString(
      <Provider store={store}>
        <App mq={mq} loginTokenPresent={settings.ssr.loginTokenPresent != null}/>
      </Provider>
    );
    const headAssets = Helmet.rewind();
    return `
    <!doctype html>
    <html>
      <head>
        ${headAssets.title.toString()}
        ${headAssets.meta.toString()}
        ${headAssets.link.toString()}
        ${createTrackingScript()}
      </head>
      <body>
        <div id="app"><div>${componentHTML}</div></div>
        <script>window.__INITIAL_STATE__ = ${JSON.stringify(initialState)}</script>
        <script>window.__SETTINGS__ = ${JSON.stringify(settings)}</script>
        ${scriptBundles()}
      </body>
    </html>`;
  }
  catch (e) {
    console.log('error rendering html:', e);
    return `React - ${e.message}`
  }
};