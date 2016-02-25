import {
  useDeps, composeWithTracker, composeAll
} from 'mantra-core';
import Component from '../components/comment_list.jsx';

export const composer = ({context, clearErrors, packageId}, onData) => {
  const {Meteor, Collections} = context();
  if (Meteor.subscribe('packages.comments', packageId).ready()) {
    const options = {
      sort: {createdAt: -1}
    };
    const comments = Collections.Comments.find({packageId}, options).fetch();
    onData(null, {comments});
  } else {
    onData();
  }
};

export default composeAll(
  composeWithTracker(composer),
  useDeps()
)(Component);
