import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/cobalt.css';

import 'codemirror';

import * as jsyaml from 'js-yaml';
(window as any).jsyaml = jsyaml;

import 'codemirror/mode/yaml/yaml';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/addon/lint/lint.js';
import 'codemirror/addon/lint/yaml-lint.js';