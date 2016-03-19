import {Packages} from '/lib/collections';
import {Meteor} from 'meteor/meteor';
import {check} from 'meteor/check';

export default function () {
  Meteor.publish('packages.list', function () {
    const selector = {};
    const options = {
      sort: {createdAt: -1},
      limit: 10
    };
    return Packages.find(selector, options);
  });

  Meteor.publish('packages.single', function (postId) {
    check(postId, String);
    const selector = {_id: postId};
    return Packages.find(selector);
  });
}
