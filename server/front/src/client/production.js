import * as Fetch from 'isomorphic-fetch';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { fetchDataForRoute } from '../lib';
import { types } from '../state';
import { createApp } from '../ux/routes';
import { settings, store, history } from './store';

import './browser';

const rootEl = document.getElementById('app');
const App = createApp(history);

function render() {
	ReactDOM.render(
		<div>
            <Provider store={store}>
               <App mq={settings.ssr.mq} loginTokenPresent={settings.ssr.loginTokenPresent != null} />
            </Provider>
        </div>,
		rootEl
	);
}

render();

function onUpdate() {
	if(window.__INITIAL_STATE__ !== null) {
		window.__INITIAL_STATE__ = null;
		return;
	}

	store.dispatch({ type: types.request.create });
	fetchDataForRoute(this.state)
		.then((data) => {
			return store.dispatch({ type: types.request.success, data });
		});
}
