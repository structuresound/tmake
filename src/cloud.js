import request from 'request-promise';
import Promise from 'bluebird';
import colors from 'chalk';
import { log } from './util/log';

const apiVer = 'v1';
const server = 'http://localhost:3000';

const login = () => Promise.resolve(log.info('loggin in'));

export default {
  post(json) {
    log.verbose(`${json.name} >> ${server}`);
    const options = {
      method: 'POST',
      uri: `${server}/api/${apiVer}/packages`,
      body: json,
      json: true
    };
    return request(options);
  },
  get(_id) {
    const options = {
      uri: `${server}/api/${apiVer}/packages/${_id}`,
      headers: {
        'User-Agent': 'Request-Promise'
      },
      json: true
    };
    return request(options);
  },
  login(db) {
    return db.findOne('user').then((record) => {
      if (record) {
        return login(record);
      }
      const user = {};
      return prompt.ask(colors.magenta('user name or email')).then((res) => {
        user.userame = res;
        return prompt.ask(colors.magenta('password'));
      }).then((res) => {
        user.password = res;
        return db.update('user', {
          $set: user
        }, { upsert: true });
      }).then(() => login(user));
    });
  }
};
