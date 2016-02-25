const {describe, it} = global;
import {expect} from 'chai';
import {stub, spy} from 'sinon';
import {composer} from '../package';

describe('core.containers.package', () => {
  describe('composer', () => {
    const Tracker = {nonreactive: cb => cb()};
    const getCollections = (package) => {
      const Collections = {
        packages: {findOne: stub()}
      };
      Collections.packages.findOne.returns(package);
      return Collections;
    };

    it('should subscribe to the given packageId via prop', () => {
      const Meteor = {subscribe: stub()};
      Meteor.subscribe.returns({ready: () => false});
      const Collections = getCollections();

      const context = () => ({Meteor, Tracker, Collections});
      const packageId = 'dwd';
      const onData = spy();

      composer({context, packageId}, onData);
      const args = Meteor.subscribe.args[0];
      expect(args.slice(0, 2)).to.deep.equal([
        'packages.single', packageId
      ]);
    });

    describe('before subscription ready', () => {
      describe('with latency componsation', () => {
        it('should call onData with data', done => {
          const Meteor = {subscribe: stub()};
          Meteor.subscribe.returns({ready: () => false});
          const package = {aa: 10};
          const Collections = getCollections(package);

          const context = () => ({Meteor, Tracker, Collections});
          const packageId = 'dwd';
          const onData = (err, data) => {
            expect(data).to.be.deep.equal({package});
            done();
          };

          composer({context, packageId}, onData);
        });
      });

      describe('with no latency componsation', () => {
        it('should call onData without nothing', done => {
          const Meteor = {subscribe: stub()};
          Meteor.subscribe.returns({ready: () => false});
          const Collections = getCollections();

          const context = () => ({Meteor, Tracker, Collections});
          const packageId = 'dwd';
          const onData = (err, data) => {
            expect(data).to.be.equal(undefined);
            done();
          };

          composer({context, packageId}, onData);
        });
      });
    });

    describe('after subscription is ready', () => {
      it('should call onData with data', done => {
        const Meteor = {subscribe: stub()};
        Meteor.subscribe.returns({ready: () => false});
        const package = {aa: 10};
        const Collections = getCollections(package);

        const context = () => ({Meteor, Tracker, Collections});
        const packageId = 'dwd';
        const onData = (err, data) => {
          expect(data).to.be.deep.equal({package});
          done();
        };

        composer({context, packageId}, onData);
      });
    });
  });
});
