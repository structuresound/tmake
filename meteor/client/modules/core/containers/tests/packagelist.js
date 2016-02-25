const { describe, it } = global;
import {expect} from 'chai';
import {stub, spy} from 'sinon';
import {composer} from '../packagelist';

describe('core.containers.packagelist', () => {
  describe('composer', () => {
    it('should subscribe to packages.list', () => {
      const Meteor = {subscribe: stub()};
      Meteor.subscribe.returns({ready: () => false});

      const context = () => ({Meteor});
      const onData = spy();

      composer({context}, onData);
      expect(Meteor.subscribe.args[0]).to.deep.equal([
        'packages.list'
      ]);
    });

    describe('after subscribed', () => {
      it('should fetch data from all packages & pass to onData', () => {
        const Meteor = {subscribe: stub()};
        Meteor.subscribe.returns({ready: () => true});

        const packages = [ {_id: 'aa'} ];
        const Collections = {packages: {find: stub()}};
        Collections.packages.find.returns({fetch: () => packages});

        const context = () => ({Meteor, Collections});
        const onData = spy();

        composer({context}, onData);
        expect(onData.args[0]).to.deep.equal([ null, {packages} ]);
      });
    });
  });
});
