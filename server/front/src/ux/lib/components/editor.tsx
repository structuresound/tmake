import * as React from 'react';
import { Grid, Row, Col, Button } from 'react-bootstrap';
import { connect } from 'react-redux';

import { types } from '../../../state';
import { Spacer } from '../layouts';
import { CodeMirror } from './codemirror';

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
            <h5 className='invisible'>title</h5>
            <p>it's just yaml (which means JSON too!)</p>
            <ul>
              <li>support multiple configurations of a project in one config file</li>
              <li>import files and inherit the environment before parsing to allow for huge, maintainable dependency graphs</li>
              <li>lack of imperative logic requires configurations to be fully<b>declarative</b></li>
            </ul>
            <p>not a programming language</p>
            <ul>
              <li>in the same way that css is not a programming language, MOSS is simply a set of rules for parsing Javascript objects</li>
              <li>this constraint allows the re-use of common tools like linters and makes the process embeddable into any JS scripting environment</li>
            </ul>
            <p>a quick explanation of some <b>keywords</b></p>
            <ul>
              <li>functions start with $, built-ins include <b>$stack, $heap, $select, and $each</b></li>
              <li>use string interpolation <b>{'${'}dot.notation{'}'}</b> heap and stack are both JSON objects</li>
              <li>selectors start with a '-'. for example <b>-production </b> is provided inline with <br/><b>$select: production: true</b></li>
              <li>selectors work like css, which means that values after a keyword are removed if:
              <ul>
                  <li>the keyword (beginning with a -) is not matched</li>
                  <li>if another higher priority (number of matched keywords) value exists in the same branch</li>
                  <li>all object operations are additive, so only the values with the same key are overwritten</li>
                </ul>
              </li>
            </ul>
          </Col>
        </Row>
        <Row>
          <Col sm={6}>
            <h5>environment</h5>
            <CodeMirror value={environment} onChange={updateEnvironment} options={{
              ...sharedOptions
            }} />
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
      </Col>
    </Row>
  )
}

const connected = connect(({ editor }) => {
  return { ...editor }
}, events)(Base);

export {
  connected as Editor
}