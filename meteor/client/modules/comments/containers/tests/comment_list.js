const { describe, it } = global;
import {expect} from 'chai';
import {stub, spy} from 'sinon';
import {composer} from '../comment_list';

describe('comments.containers.comment_list', () => {
  describe('composer', () => {
    it('should subscribe to packages.comments', () => {
      const Meteor = {subscribe: stub()};
      const packageId = 'the-packageid';
      Meteor.subscribe.returns({ready: () => false});

      const context = () => ({Meteor});
      const onData = spy();

      composer({context, packageId}, onData);
      expect(Meteor.subscribe.args[0]).to.deep.equal([
        'packages.comments', packageId
      ]);
    });

    describe('after subscribed', () => {
      it('should fetch data from all comments & pass to onData', () => {
        const Meteor = {subscribe: stub()};
        Meteor.subscribe.returns({ready: () => true});

        const comments = [ {_id: 'aa'} ];
        const Collections = {Comments: {find: stub()}};
        Collections.Comments.find.returns({fetch: () => comments});

        const context = () => ({Meteor, Collections});
        const onData = spy();

        composer({context}, onData);
        expect(onData.args[0]).to.deep.equal([ null, {comments} ]);
      });
    });
  });
});
