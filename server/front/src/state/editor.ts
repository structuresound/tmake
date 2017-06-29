import * as jsyaml from 'js-yaml';
import { load } from 'js-moss';
import { types } from './types';

const environmentFile =
  `$select:
  mac: true
  linux: false
  production: true
  debug: false
$heap:
  target:
    endianness: LE
  host:
    ninja:
      version:
        -mac: 1.5.7
        -linux: 1.4.0
`

const configFile =
  `$select:
  useCustomLibrary:
    -mac: true
    -linux: false
$heap:
  host:
    -mac:
      compiler: clang
    -linux:
      compiler: gcc
build:
  ninja:
    $stack:
      version: \${host.ninja.version}
    fetch: http://ninja-v\${version}.tar.gz
    cc: \${host.compiler}
  defines:
    $stack:
      LE: 4321
    TARGET_ENDIANNESS: \${\${target.endianness}}
  cFlags:
    -production:
      wAll: true
      o: 3
    -debug:
      o: 0
require:
  requiredLibrary: tmake/requiredLibrary
  -useCustomLibrary:
    customLibrary: tmake/customLibrary
`

const defaultState: TMake.Editor.Data = {
  config: configFile,
  environment: environmentFile,
  result: 'render'
}
defaultState.result = jsyaml.dump(load(jsyaml.load(configFile), jsyaml.load(environmentFile)));

function render(editor: TMake.Editor.Data) {
  try {
    const environment = jsyaml.load(editor.environment);
    try {
      const config = jsyaml.load(editor.config);
      const result = load(config, environment);
      return { ...editor, result: jsyaml.dump(result) }
    } catch (e) {
      return { ...editor, result: e.message };
    }
  } catch (e) {
    return { ...editor, result: e.message };
  }
}

export const editor = (state = defaultState, action: TMake.Editor.Actions.Update) => {
  const { type, value } = action;
  switch (type) {
    case types.editor.update.config: return render({ ...state, config: value });
    case types.editor.update.environment: return render({ ...state, environment: value });
    default:
      return state;
  }
};