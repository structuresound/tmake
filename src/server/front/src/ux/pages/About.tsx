import * as React from "react";
import { Grid, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { s3url } from '../../lib/assets';
import { settings } from '../../lib/settings';
import { Fullscreen as Layout, Editor, Spinner, Parallax, Trees, aligner, Spacer } from '../lib';


export function Page(props: TMake.React.PageProps) {
  const { i18n, manifest } = settings;
  const { mq, loginTokenPresent } = props;

  return (
    <Layout {...{ mq, s3url, manifest, i18n, loginTokenPresent }} >
      <div id="404">
        <section id="section-splash" className="section" style={{ height: '85vh' }}>
          {/*<Trees mq={mq} />*/}
          <div style={aligner.fullscreen as any}>
            <Grid>
              <Row>
                <Col sm={12} className="text-center">
                  <h1 style={{ fontSize: 64 }}>support</h1><h1><i> or </i></h1><h1 style={{ fontSize: 64 }}>troll</h1>
                  <Spacer height={3} />
                  <p style={{ fontSize: 24 }}>TrieMake is currently an experimental, open source, and being produced by 1 person, feel free to support or complain to Leif Shackelford using the following links</p>
                </Col>
              </Row>
              <Spacer height={2} />
              <Row>
                <Col sm={4} className="text-center">
                  <h4><a href="https://www.twitter.com/1e1f">@1e1f</a><i className="fa fa-twitter" /></h4>
                </Col>
                <Col sm={4} className="text-center">
                  <h4><a href="https://www.patreon.com/1e1f">patreon</a></h4>
                </Col>
                <Col sm={4} className="text-center">
                  <h4><a href="https://etherscan.io/address/0x452d4cdd9de2b143f23d49655c436f70c03abf9d">ethereum</a></h4>
                </Col>
              </Row>
            </Grid>
          </div>
        </section>
      </div >
    </Layout >
  )
}