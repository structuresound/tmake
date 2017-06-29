/**
 * Routes for express app
 */
import * as express from 'express';

import { routes as subscribe } from './subscribe';
import { routes as contact } from './contact';
import { routes as healthz } from './healthz';


export function init(app: express.Application) {
  app.use('/api/v1/subscribe', subscribe);
  app.use('/api/v1/contact', contact);
  app.use('/healthz', healthz);
};