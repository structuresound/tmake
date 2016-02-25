import React from 'react';
const {describe, it} = global;
import {expect} from 'chai';
import {shallow} from 'enzyme';
import Navigation from '../navigation.jsx';

describe('core.components.navigation', () => {
  it('should contain a link to home', () => {
    const el = shallow(<Navigation />);
    const homeLink = el.find('a').at(0);
    expect(homeLink.text()).to.be.equal('Home');
    expect(homeLink.prop('href')).to.be.equal('/');
  });

  it('should contain a link to create a new package', () => {
    const el = shallow(<Navigation />);
    const newpackageLink = el.find('a').at(1);
    expect(newpackageLink.text()).to.be.equal('New package');
    expect(newpackageLink.prop('href')).to.be.equal('/new-package');
  });
});
