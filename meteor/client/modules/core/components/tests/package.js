import React from 'react';
const {describe, it} = global;
import {expect} from 'chai';
import {shallow} from 'enzyme';
import package from '../package.jsx';

describe('core.components.package', () => {
  it('should display the package title', () => {
    const package = {title: 'Nice One'};
    const el = shallow(<package package={package} />);
    expect(el.find('h2').text()).to.be.match(/Nice One/);
  });

  it('should display the package content', () => {
    const package = {content: 'Nice content'};
    const el = shallow(<package package={package} />);
    expect(el.find('p').text()).to.be.match(/Nice content/);
  });

  it('should display saving indicator if saving prop is there', () => {
    const package = {saving: true};
    const el = shallow(<package package={package} />);
    expect(el.find('p').first().text()).to.be.match(/saving/i);
  });
});
