export default function ({Collections, Meteor}) {
  Meteor.methods({
    'packages.createComment'(_id, packageId, text) {
      const saving = true;
      const createdAt = new Date();
      const author = 'Me';
      Collections.Comments.insert({
        _id, packageId, text, saving, createdAt, author
      });
    }
  });
}
