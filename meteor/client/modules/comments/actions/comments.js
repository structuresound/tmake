export default {
  create({Meteor, LocalState}, packageId, text) {
    if (!text) {
      return LocalState.set('CREATE_COMMENT_ERROR', 'Comment text is required.');
    }

    if (!packageId) {
      return LocalState.set('CREATE_COMMENT_ERROR', 'packageId is required.');
    }

    LocalState.set('CREATE_COMMENT_ERROR', null);

    const id = Meteor.uuid();
    Meteor.call('packages.createComment', id, packageId, text, (err) => {
      if (err) {
        return LocalState.set('CREATE_COMMENT_ERROR', err.message);
      }
    });
  },

  clearErrors({LocalState}) {
    return LocalState.set('CREATE_COMMENT_ERROR', null);
  }
};
