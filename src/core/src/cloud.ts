import * as request from 'request-promise';
import * as Bluebird from 'bluebird';
import * as colors from 'chalk';

import { prompt } from './prompt';
import { log } from './log';

const apiVer = 'v1';
const server = 'http://localhost:3000';

interface User {
  name: string,
  password: string,
}

const _login = (user: User) => Bluebird.resolve(log.info('loggin in'));

export function post(json) {
  log.verbose(`${json.name} >> ${server}`);
  const options = {
    method: 'POST',
    uri: `${server}/api/${apiVer}/packages`,
    body: json,
    json: true
  };
  return request(options);
}

export function get(_id) {
  const options = {
    uri: `${server}/api/${apiVer}/packages/${_id}`,
    headers: {
      'User-Agent': 'Request-Bluebird'
    },
    json: true
  };
  return request(options);
}

export function login(db: any) {
  return db.findOne('user').then((record) => {
    if (record) {
      return _login(record);
    }
    const user = {
      name: '',
      password: ''
    };
    return prompt.ask(colors.magenta('user name or email')).then((res) => {
      user.name = res;
      return prompt.ask(colors.magenta('password'));
    }).then((res) => {
      user.password = res;
      return db.update('user', {
        $set: user
      }, { upsert: true });
    }).then(() => _login(user));
  });
}