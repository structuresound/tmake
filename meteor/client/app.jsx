import React from 'react';
import Header from './header/header.jsx';
// define and export our Layout component
export const Layout = ({content}) => (
  <div>
    <Header />
    <div>{content}</div>
    <footer></footer>
  </div>
);

// define and export our Welcome component
export const Welcome = ({name}) => (
  <div>
    <div class="container">
    </div>
  </div>
);
