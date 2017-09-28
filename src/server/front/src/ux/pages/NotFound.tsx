import * as React from "react";
import { Grid, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { s3url } from '../../lib/assets';
import { settings } from '../../lib/settings';
import { Fullscreen as Layout, Editor, Spinner, Parallax, Trees, aligner } from '../lib';


export function NotFound(props: TMake.React.PageProps) {
  const { i18n, manifest } = settings;
  const { mq, loginTokenPresent } = props;

  return (
    <Layout {...{ mq, s3url, manifest, i18n, loginTokenPresent }} >
      <div id="404">
        <section id="section-splash" className="section" style={{ height: '85vh' }}>
          <Trees mq={mq} />
          <div style={aligner.fullscreen as any}>
            <Grid>
              <Row>
                <Col sm={12} className="text-center">
                  <h1 style={{ fontSize: 64 }}>404</h1>
                  <Link to="/">go somewhere useful</Link>
                </Col>
              </Row>
            </Grid>
          </div>
        </section>
      </div>
    </Layout >
  )
}