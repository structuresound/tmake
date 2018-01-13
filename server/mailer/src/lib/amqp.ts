import { connect, Connection, Channel } from 'amqplib';

import { settings } from './settings';

export let connection: PromiseLike<Connection>;

const { amqp } = settings.private;
let amqpUri: string;
if (amqp.username) {
    amqpUri = `amqp://${amqp.username}:${amqp.password}@${amqp.host}:${amqp.port}`;
} else {
    amqpUri = `amqp://${amqp.host}:${amqp.port}`;
}

function init() {
    try {
        connection = connect(amqpUri);
        console.log('connected to amqp');
        clearInterval(retry);
    }
    catch (e) {
        console.log('error connecting to rabbit, trying again');
    }
}

init();
let retry = setInterval(init, 5000);

export function consume(fn: (data: any, channel: Channel) => void) {
    const queue = amqp.queues.mail;
    // Create connection to AMQP server
    connection.then((connection: Connection) => {
        // Create channel
        return connection.createChannel()
    }).then((ch) => {
        const channel = <Channel><any>ch;
        // Ensure queue for messages
        return channel.assertQueue(queue, {
            // Ensure that the queue is not deleted when server restarts
            durable: true
        }).then((assertQueue: any) => {
            // Only request 1 unacked message from queue
            // This value indicates how many messages we want to process in parallel
            channel.prefetch(1);

            // Set up callback to handle messages received from the queue
            channel.consume(queue, (data) => {
                fn(data, channel);
            });
        });
    });
}
