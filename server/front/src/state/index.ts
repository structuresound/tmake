import { combineReducers } from 'redux';
import { routerReducer as routing } from 'react-router-redux';
import { reducer as form } from 'redux-form';

import { editor } from './editor';

// Combine reducers with routeReducer which keeps track of
// router state
export const rootReducer = combineReducers({ routing, editor, form })

export * from './types';