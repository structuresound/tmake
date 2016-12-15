import {updateNode} from './db';

function test(dep) {
  return updateNode(dep, {
    $set: {
      'cache.test.success': true
    }
  }, {});
}

export default test;
