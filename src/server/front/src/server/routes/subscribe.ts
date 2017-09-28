import { Router, Request, Response, NextFunction } from 'express';

import * as bodyParser from 'body-parser';

import { Document as ContactForm, validate } from '../../schema/subscribeForm'
import { settings } from '../../lib'
import { subscribe } from '../lib/createSend';

import { parseBody } from './parse';

export class FormPoster {
  router: Router

  /**
   * Initialize the TestRouter
   */
  constructor() {
    this.router = Router();
    this.init();
  }

  public get(req: Request, res: Response, next: NextFunction) {
    return res.status(409)
      .send({
        message: 'POST only',
        status: res.status
      });
  }
  /**
   * POST
   */

  post(request: Request, response: Response) {
    const form = request.body;
    const errors = validate(form);
    if (errors) {
      console.log('errors', errors);
      return response.status(409)
        .send({
          message: JSON.stringify(errors),
          status: response.status
        });
    }
    else {
      const listId = settings.createSend.lists.general;
      return subscribe(listId, form).then((res: any) => {
        return response.status(res.status)
          .send({
            message: 'success',
            status: response.status,
            subscribed: form.email
          });
      }, (error: Error) => {
        return response.status(500)
          .send({
            message: 'We had an issue contacting campaign monitor',
            status: response.status
          });
      })
    }
  }

  /**
   * Take each handler, and attach to one of the Express.Router's
   * endpoints.
   */


  init() {
    this.router.post('/', bodyParser.json(), this.post);
    this.router.get('/', this.get);
  }
}

// Create the HeroRouter, and export its configured Express.Router
const router = new FormPoster();
router.init();

export const routes = router.router;