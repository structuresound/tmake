import { Router, Request, Response, NextFunction } from 'express';

import { check } from 'typed-json-transform';

export function parseBody(request: Request) {
    const {body} = request;
    if (check(body, Object)) {
        return body;
    }
    if (check(body, String)) {
        return JSON.parse(body);
    }
    throw new Error(`failed to parse body: ${body}`)
}