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
    // viewportMargin: 'infinity',
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
              <li>lack of imperative logic requires configurations to be <b>declarative</b></li>
            </ul>
            <p>not a programming language</p>
            <ul>
              <li>in the same way that css is not a programming language, MOSS is simply a set of rules for parsing Javascript objects</li>
              <li>this constraint allows the re-use of common tools like linters and makes the process embeddable into any JS scripting environment</li>
            </ul>
            <p>a quick explanation of some <b>keywords</b></p>
            <ul>
              <li>statements ending with {'<'} pass their branch into a function. the built in or meta functions include:
                <ul>
                  <li><b>select</b> enable/disable selectors for the next branch</li>
                  <li><b>$</b> put the next branch on the stack for later reference</li>
                  <li><b>map</b> returns a branch based on two other branches
                    <ul>
                      <li>from: return branches, each one may supply a context to the mapper</li>
                      <li>to: each key in 'from' will become the result of mapping this branch using that context</li>
                    </ul>
                  </li>
                  <li><b>each</b> like map, but doesn't return a branch</li>
                </ul>
              </li>
              <li>use string interpolation in a key or value by using <b>{'$'}keyPath</b> or <b>{'${'}keyPath{'}'}</b>. May reference any keyPath higher up the trie, or vars put on the stack earlier with the <b>{'$<'}</b> function</li>
              <li>selectors start with <b>=</b>. for example <b>=production </b> is provided inline with <br /><b>select{'<'}: production: true</b></li>
              <li>selectors don't use precedence, instead they are simply a list of conditional statements
              <ul>
                  <li>if a selected branch contains a scalar value it overwrites previous branch</li>
                  <li>if a selected branch contains an object value it merges into the previous branch, by adding its keys</li>
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
}, events)(Base as any);

export {
  connected as Editor
}
