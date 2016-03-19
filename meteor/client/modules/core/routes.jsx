import React from 'react';
import {mount} from 'react-mounter';

import MainLayout from './components/main_layout.jsx';
import packageList from './containers/packagelist';
import package from './containers/package';
import Newpackage from './containers/newpackage';

export default function(injectDeps, {FlowRouter}) {
  const MainLayoutCtx = injectDeps(MainLayout);

  FlowRouter.route('/', {
    name: 'packages.list',
    action() {
      mount(MainLayoutCtx, {
        content: () => (<packageList/>)
      });
    }
  });

  FlowRouter.route('/package/:packageId', {
    name: 'packages.single',
    action({packageId}) {
      mount(MainLayoutCtx, {
        content: () => (<package packageId={packageId}/>)
      });
    }
  });

  FlowRouter.route('/new-package', {
    name: 'newpackage',
    action() {
      mount(MainLayoutCtx, {
        content: () => (<Newpackage/>)
      });
    }
  });
}
