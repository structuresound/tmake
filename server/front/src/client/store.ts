import { Router } from 'react-router';
import { createBrowserHistory } from 'history';

import { initialize } from '../lib/settings';
export const settings = initialize(window.__SETTINGS__);
import { createStore } from '../lib';

export const history = createBrowserHistory();
export const store = createStore(window.__INITIAL_STATE__, history);