import * as jsyaml from 'js-yaml';
import { load } from 'js-moss';
import { types } from './types';

const environmentFile =
  `select<:
  host-mac: true
  host-linux: false
  production: true
  debug: false
  ios: true
  mac: false
`

const configFile =
  `select<:
  useCustomLibrary:
    =: false
    =ios: true
$<:
  host:
    ninja:
        version:
          =host-mac: 1.5.7
          =host-linux: 1.4
    compiler:
      =host-mac: clang
      =host-linux: gcc
  graphicsLib:
    =*: opengl
    =win: directx
  build>:
    ninja:
      cc: $host.compiler
      fetch: http://ninja-v\${host.ninja.version}.tar.gz
    defines:
      $<:
        LE: 4321
        BE: 1234
      TARGET_ENDIANNESS: \${$endianness}
    cFlags:
      =production:
        wAll: true
        O: 3
      =debug:
        O: 0
    link:
      $graphicsLib: $graphicsLib
build:
  map<:
    from:
      =mac, linux:
        device:
          arch: x64
          endianness: LE
      =ios !linux:
        device:
          arch: arm
          endianness: BE
        simulator:
          arch: x64
          endianness: LE
    to: $build
require:
  requiredLibrary: tmake/requiredLibrary
  =useCustomLibrary:
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
