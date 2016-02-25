import React from 'react';
const {describe, it} = global;
import {expect} from 'chai';
import {shallow} from 'enzyme';
import Newpackage from '../newpackage.jsx';

describe('core.components.newpackage', () => {
  it('should show the error if there are any', () => {
    const error = 'TheError';
    const el = shallow(<Newpackage error={error} />);
    expect(el.html()).to.match(/TheError/);
  });

  it('should display the create package form', () => {
    const el = shallow(<Newpackage />);
    const title = el.find('input').first();
    const content = el.find('textarea').first();
    const form = el.find('form').first();

    expect(title.node.ref).to.be.equal('titleRef');
    expect(content.node.ref).to.be.equal('contentRef');
    expect(form.prop('onSubmit')).to.be.a('function');
  });

  it('should create a new package when click on the button', done => {
    const title = 'the-title';
    const content = 'the-content';

    const onCreate = (t, c) => {
      expect(t).to.be.equal(title);
      expect(c).to.be.equal(content);
      done();
    };

    const el = shallow(<Newpackage create={onCreate} />);
    const instance = el.instance();

    instance.refs = {
      titleRef: {value: title},
      contentRef: {value: content}
    };

    el.find('form').simulate('submit');
  });
});
