import * as React from "react";
import { Nav, Navbar, MenuItem, NavDropdown } from 'react-bootstrap';
import { Grid, Row, Col, Button, Image, NavItem } from 'react-bootstrap';
import { LinkContainer, IndexLinkContainer } from 'react-router-bootstrap';
import * as MediaQuery from 'react-responsive';
import { contains, combine, clone } from 'typed-json-transform';
import { connect } from 'react-redux';

import { gradients, aligner, layout, colors } from '../styles';

const styles = {
  navbar: {
    paddingLeft: '15px',
    paddingRight: '15px',
    borderImage: `${gradients.rainbow} 5 stretch`,
    borderWidth: '0 0 1px',
    marginBottom: 0,
  }
}

function Login({ user }: { user?: TMake.User }) {
  if (user) {
    const img = user.profile_s3_cropped_url();
    return (
      <Nav pullRight={true}>
        <LinkContainer to='/account'>
          <NavItem>account</NavItem>
        </LinkContainer>
        <LinkContainer className="image" to='/account' >
          <NavItem style={{ paddingTop: 0, paddingBottom: 0 }} >
            {img && <Image className='img img-circle' src={img} style={{ height: '48px' }} />}
          </NavItem>
        </LinkContainer>
      </Nav>
    )
  } else {
    return (
      <Nav pullRight={true}>
        <LinkContainer to='/join'>
          <NavItem>join</NavItem>
        </LinkContainer>
        <LinkContainer to='/login'>
          <NavItem>
            <Button className="btn btn-outline">Login</Button>
          </NavItem>
        </LinkContainer>
      </Nav >
    )
  }
}

function DesktopNav(props: TMake.React.Navbar) {
  const { s3url, manifest, account, loginTokenPresent } = props;
  const logo = manifest.theme['static/logo.png'];
  return (<div>
    <Navbar fluid style={styles.navbar}>
      <Navbar.Header>
        <Navbar.Brand>
          <a href='/' style={aligner.withHeight(layout.navbar.height) as any}>
            <Image src={logo} style={{ height: '54px' }} />
          </a>
        </Navbar.Brand>
      </Navbar.Header>
      {/*<Nav>
        <LinkContainer to='/offerings'>
          <NavItem>offerings</NavItem>
        </LinkContainer>
      </Nav>*/}
      {/*<Login user={account.user || (loginTokenPresent ? { profile_s3_cropped_url: () => false, portfolio: false, roles: [] } : undefined)} />*/}
    </Navbar>
  </div>)
}

function MobileNav(props: TMake.React.Navbar) {
  const { s3url, manifest, account, loginTokenPresent } = props;
  const logo = manifest.theme['static/logo.png'];
  return (
    <div>
      <Navbar fluid style={styles.navbar}>
        <Navbar.Header style={aligner.withHeight(layout.navbar.height) as any}>
          <Navbar.Brand>
            <a href='/' style={aligner.withHeight(layout.navbar.height) as any}>
              <img src={logo} style={{ height: '54px' }} />
            </a>
          </Navbar.Brand>
        </Navbar.Header>
      </Navbar>
    </div>
  )
}

function NavbarComponent(upstream: TMake.React.Navbar) {
  const { mq } = upstream;
  return (
    <div>
      <MediaQuery minWidth={769} values={mq}>
        <DesktopNav {...upstream} />
      </MediaQuery>
      <MediaQuery maxWidth={768} values={mq}>
        <MobileNav {...upstream} />
      </MediaQuery>
    </div>
  )
}

const connectedNavbar = connect(({ account }) => {
  return { account };
})(NavbarComponent as any);

export {
  connectedNavbar as Navbar
}
