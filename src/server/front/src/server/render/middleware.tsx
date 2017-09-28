import * as express from 'express';
import { matchPath } from 'react-router';
import { routes as getRoutes } from '../../ux/routes';
import { fetchDataForRoute, settings, createStore } from '../../lib';
import { types } from '../../state';
import { renderPage } from './pageRenderer';
import { mq } from './ssr';
import { any } from 'typed-json-transform';
import { join } from 'path';

import { createMemoryHistory } from 'history';

import { NotFound } from '../../ux/pages/notFound';

import { parse } from 'url';

const routes = Object.keys(getRoutes());

export function render(req: express.Request, res: express.Response) {
    const history = createMemoryHistory();
    history.push(req.url);
    const store = createStore({}, history);
    const { cookies, url } = req;
    store.dispatch({ type: types.request.create });
    return fetchDataForRoute(url)
        .then((data: any) => {
            store.dispatch({ type: types.request.success, data });
            res.status(200).send(renderPage(store, history, url, mq(req), cookies));
        })
        .catch((err: Error) => { res.status(500).json(err); });
}

export function fetchCookieUser(req: express.Request, res: express.Response, next: Function) {
    const cookies = {
        login: req.cookies.chroma_login
    };
    req.cookies = cookies;
    // if (chroma_login) {
    //     // const user = Meteor.users.findOne({ 'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(token) });
    //     // req.userId = user._id
    //     console.log('meteor token', chroma_login);
    // }
    next();
}
