import {packages, Comments} from '/lib/collections';
import {Meteor} from 'meteor/meteor';
import {check} from 'meteor/check';

export default function () {
  Meteor.publish('packages.list', function () {
    const selector = {};
    const options = {
      fields: {_id: 1, title: 1},
      sort: {createdAt: -1},
      limit: 10
    };

    return packages.find(selector, options);
  });

  Meteor.publish('packages.single', function (postId) {
    check(postId, String);
    const selector = {_id: postId};
    return packages.find(selector);
  });

  Meteor.publish('packages.comments', function (postId) {
    check(postId, String);
    const selector = {postId};
    return Comments.find(selector);
  });
}
