import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { Provider } from 'react-redux';

import './browser';

require('../../../theme/src/dark');

import { store, history, settings } from './store';
import { fetchDataForRoute } from '../lib';
import { createApp } from '../ux/routes';
import { types } from '../state';
import { request } from '../lib/fetch';

window.request = request;

const rootEl = document.getElementById('app');

const App = createApp(history);

function render(Root) {
	ReactDOM.render(
		<AppContainer>
			<Provider store={store}>
				<Root mq={settings.ssr.mq} loginTokenPresent={settings.ssr.loginTokenPresent != null} />
			</Provider>
		</AppContainer>,
		rootEl
	);
}

render(createApp(history));

if(module.hot) {
	module.hot.accept('../ux/routes', () => render(createApp(history)));
}

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
