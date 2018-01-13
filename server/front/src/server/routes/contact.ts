import { Router, Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';

import { settings } from '../../lib/settings';
import { Document as ContactForm, validate } from '../../schema/contactForm'

import { send } from '../lib/email';

import { parseBody } from './parse';



export class Emailer {
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
    const form: ContactForm = request.body;
    const errors = validate(form);
    if (errors) {
      console.log('errors', errors);
      return response.status(409).send({
        message: JSON.stringify(errors),
        status: response.status
      });
    }
    else {
      const email: TMake.Email = {
        from: settings.email.contact,
        to: settings.email.support,
        replyTo: form.email,
        subject: `new contact: ${form.name}`,
        template: 'contact',
        data: form,
      }
      return send(email).then((res: any) => {
        return response.status(201)
          .send({
            message: 'success',
            status: response.status,
            subscribed: form.email
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
const router = new Emailer();
router.init();

export const routes = router.router;