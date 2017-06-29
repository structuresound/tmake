import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';

import { renderTemplate } from './lib/render';
import { propsForTemplate, optionsForTemplate } from './schema/defaults';

import { settings } from './lib';

import { routes as healthz } from './routes/healthz';

// Creates and configures an ExpressJS web server.
class App {

  // ref to Express instance
  public express: express.Application;
  //Run configuration methods on the Express instance.
  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
  }

  // Configure Express middleware.
  private middleware(): void {
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
  }

  // Configure API endpoints.
  private routes(): void {
    /* This is just to get up and running, and to make sure what we've got is
     * working so far. This function will change when we start to add more
     * API endpoints */
    let router = express.Router();
    // placeholder route handler
    this.express.use('/', router);
    router.get('/', (req, res, next) => {
      res.json({
        message: `Looks like you are trying to access a ${settings.i18n.title} mailer`
      });
    });
    router.use('/healthz', healthz);
    router.get('/render/:template', (req, res, next) => {
      const template: any = req.param('template');
      try {
        const html = renderTemplate(template, propsForTemplate(template), optionsForTemplate(template));
        return res.status(200)
          .send(html);
      } catch (e) {
        console.log('error rendering template', e);
        return res.status(404)
          .send({
            message: `no template for: ${template}`,
            status: res.status
          });
      }
    });
  }
}

export default new App().express;
