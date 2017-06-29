require('isomorphic-fetch');

import { settings } from './settings';

type METHOD = 'GET' | 'POST'

interface FetchRequest {
    url: string, body?: any, mode?: any, auth?: { user: string, password?: string }
}

export function get({ url, body, mode, auth }: FetchRequest) {
    const headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');
    headers.append('User-Agent', 'https://chroma.fund/v' + settings.version);
    if (auth) {
        const encoded = 'Basic ' + new Buffer(`${auth.user}:${auth.password || 'x'}`).toString('base64');
        headers.append('Authorization', encoded);
    }
    return fetch(url, {
        method: 'GET',
        headers,
        mode: mode || 'cors',
        cache: 'default',
    })
}

export function post({ url, body, mode, auth }: FetchRequest) {
    const headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');
    headers.append('User-Agent', 'https://chroma.fund/v' + settings.version);
    if (auth) {
        const encoded = 'Basic ' + new Buffer(`${auth.user}:${auth.password || 'x'}`).toString('base64');
        headers.append('Authorization', encoded);
    }
    return fetch(url, {
        method: 'POST',
        headers,
        mode: mode || 'cors',
        cache: 'default',
        body: JSON.stringify(body)
    })
}