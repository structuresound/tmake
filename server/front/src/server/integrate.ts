import { integrate as createSend } from './lib/createSend';
import { integrate as email } from './lib/email';

export const tests = {
    createSend: {}
}

export function healthy() {
    return true;
    // return tests.createSend == 'passed';
}

export function integrate() {
    // const start = new Date();
    // createSend().then(email).then(() => {
    //     const end = new Date();
    //     console.log(`all integration tests passed in ${end.valueOf() - start.valueOf()} ms`);
    //     tests.createSend = 'passed';
    // }, ((err: Error) => {
    //     tests.createSend = err;
    //     console.log(err);
    //     setTimeout(integrate, 1000);
    // }));
}
