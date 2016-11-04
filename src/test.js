import * as db from './db';

export default {
  execute(dep) {
    return db.update({
      name: dep.name
    }, {
      $set: {
        'cache.test.success': true
      }
    }, {});
  }
};
