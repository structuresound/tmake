import {check} from 'meteor/check';

export default function ({Meteor, Collections}) {
  Meteor.methods({
    'packages.create'(_id, title, content) {
      check(_id, String);
      check(title, String);
      check(content, String);

      const createdAt = new Date();
      const package = {
        _id, title, content, createdAt,
        saving: true
      };

      Collections.packages.insert(package);
    }
  });
}
