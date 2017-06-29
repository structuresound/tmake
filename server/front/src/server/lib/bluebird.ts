import * as Bluebird from 'bluebird';

Bluebird.onPossiblyUnhandledRejection(function (e: Error, promise: any) {
  console.log(e.message);
  console.log(e.stack);
});