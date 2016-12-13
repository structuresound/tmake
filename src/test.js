import {cache as db} from './db';

function test(dep) {
  return db.update({
    name: dep.name
  }, {
    $set: {
      'cache.test.success': true
    }
  }, {});
}

export default test;
