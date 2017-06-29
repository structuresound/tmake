import { connect, Connection, Channel } from 'amqplib';
import { settings } from '../../lib/settings';
import './bluebird';


const { amqp } = settings.private;
let amqpUri: string;
if (amqp.username) {
    amqpUri = `amqp://${amqp.username}:${amqp.password}@${amqp.host}:${amqp.port}`;
} else {
    amqpUri = `amqp://${amqp.host}:${amqp.port}`;
}

let connection: PromiseLike<Connection> = {
    then: () => {
        return Promise.reject('amqp connection not established yet');
    }
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

let retry = setInterval(init, 5000);

export function postToQueue(q: string, data: string) {
    return connection.then(function (conn) {
        return conn.createChannel();
    }).then((ch) => {
        const channel = <Channel><any>ch;
        return channel.assertQueue(q).then(function (ok) {
            return channel.sendToQueue(q, new Buffer(data));
        });
    })
}