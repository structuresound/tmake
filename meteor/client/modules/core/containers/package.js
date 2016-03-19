import package from '../components/package.jsx';
import {
  useDeps,
  composeWithTracker,
  composeAll
} from 'mantra-core';

export const composer = ({
  context,
  packageId
}, onData) => {
  const {
    Meteor,
    Collections
  } = context();

  if (Meteor.subscribe('packages.single', packageId).ready()) {
    const package = Collections.packages.findOne(packageId);
    onData(null, {
      package
    });
  } else {
    const package = Collections.packages.findOne(packageId);
    if (package) {
      onData(null, {
        package
      });
    } else {
      onData();
    }
  }
};

export default composeAll(
  composeWithTracker(composer),
  useDeps()
)(package);
