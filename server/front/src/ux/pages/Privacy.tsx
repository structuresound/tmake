import * as React from "react";
import { Grid, Row, Col, Button } from 'react-bootstrap';
import { settings } from '../../lib/settings';

import { s3url } from '../../lib/assets';
import { Page as Layout, aligner } from '../lib';

export function Page(props: TMake.React.PageProps) {
  const { mq } = props;
  const { i18n } = settings;
  return (<Layout {...{ s3url, mq, i18n }}>
    <section id="section-contact" className="section" style={aligner.fullscreen as any}>
      <Grid>
        <Row>
          <Col sm={12}>
          <h2 className="page-header text-center chroma info">Privacy Policy</h2>
          </Col>
        </Row>
        <Row>
          <Col sm={12}>
            privacy
          </Col>
        </Row>
      </Grid>
    </section>
  </Layout>
  )
}