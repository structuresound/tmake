import { Connection, Channel } from 'amqplib';
import * as nodemailer from 'nodemailer';
import * as aws from 'aws-sdk';

import { settings } from './settings';
import { render } from './render';

import { consume } from './amqp';

aws.config.update(settings.private.aws);

// create Nodemailer SES transporter
export const transport = nodemailer.createTransport(<any>{
    SES: new aws.SES({
        apiVersion: '2010-12-01'
    }),
    sendingRate: 1 // max 1 messages/second
});

consume((data: any, channel: Channel) => {
    if (data === null) {
        return;
    }

    // Decode message contents
    let message = JSON.parse(data.content.toString());

    if (message.template) {
        message = render(message);
    }
    // // attach message specific authentication options
    // // this is needed if you want to send different messages from
    // // different user accounts
    // message.auth = {
    //     user: 'testuser',
    //     pass: 'testpass'
    // };

    // Send the message using the previously set up Nodemailer transport
    transport.sendMail(message, (err: Error, info: any) => {
        if (err) {
            console.error(err.stack);
            // put the failed message item back to queue
            // return channel.nack(data);
        }
        if (info) {
            console.log('Delivered message %s', info.messageId);
        }
        // remove message item from the queue
        channel.ack(data);
    });
});