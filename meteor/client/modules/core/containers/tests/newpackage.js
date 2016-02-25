const { describe, it } = global;
// import {expect} from 'chai';
// import {stub, spy} from 'sinon';
// import {composer, depsMapper} from '../newpackage';

describe('containers.newpackage', () => {
  describe('composer', () => {
    it('should get SAVING_ERROR from local state');
    it('should get SAVING_NEW_package from local state');
  });

  describe('depsMapper', () => {
    describe('actions', () => {
      it('should map packages.create');
      it('should map packages.clearErrors');
    });
    describe('context', () => {
      it('should map the whole context as a function');
    });
  });
});
