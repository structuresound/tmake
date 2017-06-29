import { createStore as _createStore, applyMiddleware, compose } from 'redux';
import { routerMiddleware } from 'react-router-redux';
import thunk from 'redux-thunk';

import { settings } from './settings';
import { rootReducer } from '../state';

/*
 * @param {Object} initial state to bootstrap our stores with for server-side
 * rendering
 * @param {History Object} a history object. We use `createMemoryHistory` for
 * server-side rendering,
 *                          while using browserHistory for client-side
 *                          rendering.
 */

export function createStore(initialState: any, history: any) {
  // Installs hooks that always keep react-router and redux store in sync
  const middleware = [thunk, routerMiddleware(history)];
  let store: any;

  if (settings.env.isClient && settings.env.debug) {
    const createLogger = require('redux-logger');

    middleware.push(createLogger());

    const enhancer = compose(applyMiddleware(...middleware),
      window.devToolsExtension ? window.devToolsExtension() : (f: any) => f);
    store = _createStore(rootReducer, initialState, enhancer);
  } else {
    const enhancer = compose(applyMiddleware(...middleware), (f: any) => f);
    store = _createStore(rootReducer, initialState, enhancer as any);
  }

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept('../state', () => {
      const nextReducer = require('../state');

      store.replaceReducer(nextReducer);
    });
  }

  return store;
}