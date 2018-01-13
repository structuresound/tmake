import { postToQueue } from './amqp';
import { settings } from '../../lib/settings';

const mailQueue = settings.private.amqp.queues.mail;

export function send(doc: TMake.Email) {
    return postToQueue(mailQueue, JSON.stringify(doc));
}

export function integrate() {
    const email: TMake.Email = {
        from: settings.email.contact,
        to: 'dev@chroma.io',
        replyTo: 'dev@chroma.io',
        subject: `new contact: Integration test`,
        html: '<p> passing test! </p>',
        generateTextFromHTML: true
    }
    return postToQueue(mailQueue, JSON.stringify(email));
}