import * as React from "react";
import { findDOMNode } from "react-dom";

import { Grid, Row, Col, Button } from 'react-bootstrap';
import * as MediaQuery from 'react-responsive';
import { connect } from 'react-redux';
import { Fullscreen as Layout, Editor, Spinner, Parallax, Trees, aligner, Spacer } from '../lib';

import { s3url } from '../../lib/assets';
import { ReduxForm as SubscribeForm } from '../forms/subscribe';
import { settings } from '../../lib/settings';

import { types } from '../../state';
import { CodeMirror } from '../lib/components/codemirror';

const events = (dispatch: Function) => {
  return {
    updateConfig: (value: string) => {
      dispatch({ type: types.editor.update.config, value });
    },
    updateEnvironment: (value: string) => {
      dispatch({ type: types.editor.update.environment, value });
    }
  } as TMake.Editor.Events
}
let sectionConnect: any;

export function Playground(props: TMake.React.PageProps) {
  const { i18n, manifest } = settings;
  const { mq, loginTokenPresent } = props;

  return (
    <Layout {...{ mq, s3url, manifest, i18n, loginTokenPresent }} >
      <div id="mossPlayground">
        <Grid>
          <Row>
            <Col sm={12}>
              <h2 className="text-center page-header chroma info">Try Moss</h2>
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              <p>Moss can be run as a command line tool, or embedded as a library. When used as a library one supplies the environment as json, which is represent here as another yaml file</p>
            </Col>
          </Row>
          <Editor />
        </Grid>
        <Spacer height={2} />
      </div>
    </Layout >
  )
}


function Base(props: TMake.Editor.Data & TMake.Editor.Events) {
  const { config, environment, result, updateConfig, updateEnvironment } = props;
  const sharedOptions = {
    lineNumbers: true,
    mode: 'yaml',
    theme: 'cobalt',
    lint: true,
    gutters: ["CodeMirror-lint-markers"],
    lineWrapping: true,
    tabSize: 2,
    smartIndent: 2,
    indentUnit: 2,
    indentWithTabs: false,
    extraKeys: {
      Tab(cm: any) {
        if (cm.somethingSelected()) {
          return cm.indentSelection('add');
        } else {
          const sel = cm.getOption('indentWithTabs') ? '\t' : Array(cm.getOption('indentUnit') + 1).join(' ');
          return cm.replaceSelection(sel, 'end', '+input');
        }
      }
    }
  }
  return (
    <Row>
      <Col sm={12}>
        <Row>
          <Col sm={6}>
            <h5>input</h5>
            <CodeMirror value={config} onChange={updateConfig} options={{
              ...sharedOptions
            }} className="autoResize" />
          </Col>
          <Col sm={6}>
            <h5>output</h5>
            <CodeMirror name='result' value={result} options={{
              ...sharedOptions,
              readOnly: true,
              lint: false
            }} />
          </Col>
        </Row>
        <Row>
          <Col sm={6}>
            <h5>environment</h5>
            <CodeMirror value={environment} onChange={updateEnvironment} options={{
              ...sharedOptions
            }} />
          </Col>
        </Row>
      </Col>
    </Row>
  )
}

const connected = connect(({ editor }) => {
  return { ...editor }
}, events)(Base as any);

export {
  connected as Editor
}
