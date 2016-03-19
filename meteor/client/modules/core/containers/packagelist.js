import packageList from '../components/packagelist.jsx';
import {
  useDeps,
  composeWithTracker,
  composeAll
} from 'mantra-core';

export const composer = ({
  context
}, onData) => {
  const {
    Meteor,
    Collections
  } = context();
  if (Meteor.subscribe('packages.list').ready()) {
    const packages = Collections.packages.find().fetch();
    onData(null, {
      packages
    });
  }
};

export default composeAll(
  composeWithTracker(composer),
  useDeps()
)(packageList);
