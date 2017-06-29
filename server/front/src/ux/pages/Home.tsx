import * as React from "react";
import { findDOMNode } from "react-dom";

import { Grid, Row, Col, Button } from 'react-bootstrap';
import * as MediaQuery from 'react-responsive';
import { connect } from 'react-redux';
import { Fullscreen as Layout, Editor, Spinner, Parallax, Trees, aligner } from '../lib';

import { s3url } from '../../lib/assets';
import { ReduxForm as SubscribeForm } from '../forms/subscribe';
import { settings } from '../../lib/settings';

let sectionConnect: any;

export function Home(props: TMake.React.PageProps) {
  const { i18n, manifest } = settings;
  const { mq, loginTokenPresent } = props;

  return (
    <Layout {...{ mq, s3url, manifest, i18n, loginTokenPresent }} >
      <div id="home">
        <section id="section-splash" className="section" style={{ height: '85vh' }}>
          <Trees mq={mq} />
          <div style={aligner.fullscreen as any}>
            <Grid>
              <Row>
                <Col md={1} />
                <Col sm={11}>
                  <h1 className="page-header">a source code graph you can <i>depend</i> on
                                    <hr className="chroma" />
                    <div className="small no-text-transform">easily compose smaller libraries to create <i>your</i> cross platform c++ framework</div>
                  </h1>
                  {/*<button id="contact-button" onClick={() => sectionConnect && sectionConnect.scrollIntoView({ behavior: 'smooth' })} type="submit" className="btn btn-chroma btn-lg">Learn More</button>*/}
                </Col>
              </Row>
            </Grid>
          </div>
        </section>
        <section id="section-connect" ref={c => (sectionConnect = c)} className="section" style={aligner.fullscreen as any}>
          <Grid>
            <Row>
              <Col sm={12}>
                <h2 className="text-center page-header chroma info">Introducing MOSS</h2>
              </Col>
            </Row>
            <Row>
              <Col sm={12}>
                <p>Moss allows for dynamic configuration files that previously would have required an imperative language.
                  Moss is not turing complete, instead it attempts to be a simple and terse way to describe project requirements and variations.
                  The parsing rules are a result of attempting replicate more complex build systems using the least effort.</p>
              </Col>
            </Row>
            <Row>
              <Col sm={12}>
                <h5 className="text-center"><b>Moss </b> grows on <b>Tries </b> and keeps them <b>DRY</b></h5>
              </Col>
            </Row>
            <Editor />
          </Grid>
        </section>
        <section id="section-subcribe" className="section inverse" style={aligner.fullscreen as any}>
          <Grid>
            <Row>
              <Col sm={2} />
              <Col sm={8}>
                <h2 className="page-header text-center chroma info">Stay in the loop
            <div className="small">Maybe you don't have time to dive into the code, we'll let you know about major milestones</div>
                </h2>
              </Col>
            </Row>
            <Row>
              <Col sm={2} />
              <Col sm={8}>
                <SubscribeForm />
              </Col>
            </Row>
          </Grid>
        </section>
      </div>
    </Layout >
  )
}

connect()(Home);