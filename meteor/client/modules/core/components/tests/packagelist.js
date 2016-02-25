import React from 'react';
const {describe, it} = global;
import {expect} from 'chai';
import {shallow} from 'enzyme';
import packageList from '../packagelist.jsx';

describe('core.components.packagelist', () => {
  const packages = [
    {title: 't-one', _id: 'one'},
    {title: 't-two', _id: 'two'},
  ];

  it('should list given number of items', () => {
    const el = shallow(<packageList packages={packages}/>);
    expect(el.find('li').length).to.be.equal(packages.length);
  });

  it('should list package title for each item', () => {
    const el = shallow(<packageList packages={packages}/>);
    const lis = el.find('li');
    lis.forEach((li, index) => {
      const aText = li.find('a').first().text();
      expect(aText).to.be.equal(packages[index].title);
    });
  });

  it('shallow list package link for each items', () => {
    const el = shallow(<packageList packages={packages}/>);
    const lis = el.find('li');
    lis.forEach((li, index) => {
      const href = li.find('a').first().prop('href');
      expect(href).to.be.equal(`/package/${packages[index]._id}`);
    });
  });
});
