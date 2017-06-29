import * as React from "react";
import { Grid, Row, Col, Button } from 'react-bootstrap';
import { settings } from '../../lib/settings';
import { s3url } from '../../lib/assets';
import { Page as Layout, aligner } from '../lib';

export function Page(props: TMake.React.PageProps) {
  const { mq } = props;
  const { i18n } = settings;
  return (<Layout {...{ mq, s3url, i18n }}>
    <section id="section-contact" className="section" style={aligner.fullscreen as any}>
      <Grid>
        <Row>
          <Col sm={1} />
          <Col sm={10}>
            <h2 className="page-header text-center chroma info">Terms of Service</h2>
          </Col>
        </Row>
        <Row>
          <Col sm={1} />
          <Col sm={10}>
            terms of service
          </Col>
        </Row>
      </Grid>
    </section>
  </Layout>
  )
}