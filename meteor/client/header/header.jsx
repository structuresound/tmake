import React from 'react';
import AppBar from 'material-ui/lib/app-bar';
import RaisedButton from 'material-ui/lib/raised-button';
import ThemeManager from 'material-ui/lib/styles/theme-manager';
import MyRawTheme from '../style/material-ui-theme.js';

const LoginButton = () => (<RaisedButton label="Login"/>);

const Header = React.createClass({

  //the key passed through context must be called "muiTheme"
  childContextTypes: {
    muiTheme: React.PropTypes.object
  },

  getChildContext() {
    return {muiTheme: ThemeManager.getMuiTheme(MyRawTheme)};
  },

  //the app bar and button will receive our theme through
  //context and style accordingly
  render() {
    return (
      <div>
        <AppBar title="dbMake" iconClassNameRight="muidocs-icon-navigation-expand-more"/>
      </div>
    );
  }
});

export default Header;
