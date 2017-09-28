import Oy from 'oy-vey';
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import { map, every } from 'typed-json-transform';
import { transport } from './lib/mailer';

import { Test } from './emails';

export const testResults = {
    sandboxSuccess: {},
    sandboxBounce: {}
}

export function healthz() {
    const results = map(testResults, (result) => result === 'passed');
    return every(results, (result: boolean) => result);
}

export function integrate() {
    const start = new Date();
    const testSuccess: TMake.Email = {
        from: 'contact@chroma.fund',
        to: 'success@simulator.amazonses.com',
        replyTo: 'contact@chroma.fund',
        subject: `new contact: TMake Fund`,
        html: Oy.renderTemplate(<Test />, {
            title: 'This is an example',
            previewText: 'This is an example'
        }),
        generateTextFromHTML: true
    }

    const testBounce: TMake.Email = {
        from: 'bounce@chroma.fund',
        to: 'bounce@simulator.amazonses.com',
        replyTo: 'bounce@chroma.fund',
        subject: `bounce me!`,
        html: '<p>this should bounce</p>',
        generateTextFromHTML: true
    }

    testBounce.to = 'bounce@simulator.amazonses.com';
    transport.sendMail(testSuccess, (err: Error, info: any) => {
        if (err) {
            console.error(err.stack);
            testResults.sandboxSuccess = err;
        } else {
            console.log('Delivered message %s', info.messageId);
            testResults.sandboxSuccess = 'passed';
            transport.sendMail(testBounce, (err: Error, info: any) => {
                if (err) {
                    console.error(err.stack);
                    testResults.sandboxBounce = err;
                } else {
                    console.log('Bounced message %s', info.messageId);
                    testResults.sandboxBounce = 'passed';
                    const end = new Date();
                    console.log(`all integration tests passed in ${end.valueOf() - start.valueOf()} ms`);
                }
            });
        }
    });
}