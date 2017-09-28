import * as React from "react";
import * as ReactDOM from "react-dom";
import debounce = require('lodash.debounce');
import { isEqual } from 'typed-json-transform';

function normalizeLineEndings(str: string) {
  if (!str) return str;
  return str.replace(/\r\n|\r/g, '\n');
}

interface CodeMirrorProps {
  autoFocus?: boolean,
  className?: any,
  codeMirrorInstance?: Function,
  defaultValue?: string,
  name?: string,
  onChange?: Function,
  onCursorActivity?: Function,
  onFocusChange?: Function,
  onScroll?: Function,
  options?: any,
  path?: string,
  value?: string,
  preserveScrollPosition?: boolean,
}

interface CodeMirrorState {
  isFocused: boolean
}

export class CodeMirror extends React.Component<CodeMirrorProps, CodeMirrorState>{
  codeMirror: any;
  textareaNode: any;

  constructor(props: CodeMirrorProps) {
    super(props);
    // set initial state
    this.state = { isFocused: false };
  }

  componentWillMount() {
    this.componentWillReceiveProps = debounce(this.componentWillReceiveProps, 0);
    if (this.props.path) {
      console.error('Warning: react-codemirror: the `path` prop has been changed to `name`');
    }
  }

  componentDidMount() {
    const focusChanged = (focused: any) => {
      this.setState({
        isFocused: focused,
      });
      this.props.onFocusChange && this.props.onFocusChange(focused);
    }
    const focus = () => {
      focusChanged(true);
    }
    const blue = () => {
      focusChanged(false);
    }
    const codeMirrorInstance = this.props.codeMirrorInstance || require('codemirror');
    const codeMirror = codeMirrorInstance.fromTextArea(this.textareaNode, this.props.options);
    codeMirror.on('change', (doc: any, change: any) => {
      if (this.props.onChange && change.origin !== 'setValue') {
        this.props.onChange(doc.getValue(), change);
      }
    })
    codeMirror.on('cursorActivity', (cm: any) => {
      this.props.onCursorActivity && this.props.onCursorActivity(cm);
    });
    codeMirror.on('focus', focus)
    codeMirror.on('blur', blur)
    codeMirror.on('scroll', (cm: any) => {
      this.props.onScroll && this.props.onScroll(cm.getScrollInfo());
    });
    codeMirror.setValue(this.props.value || '');

    this.codeMirror = codeMirror;
  }

  componentWillUnmount() {
    // is there a lighter-weight way to remove the cm instance?
    if (this.codeMirror) {
      this.codeMirror.toTextArea();
    }
  }

  componentWillReceiveProps(nextProps: any) {
    if (this.codeMirror && nextProps.value !== undefined && nextProps.value !== this.props.value && normalizeLineEndings(this.codeMirror.getValue()) !== normalizeLineEndings(nextProps.value)) {
      if (this.props.preserveScrollPosition) {
        var prevScrollPosition = this.codeMirror.getScrollInfo();
        this.codeMirror.setValue(nextProps.value);
        this.codeMirror.scrollTo(prevScrollPosition.left, prevScrollPosition.top);
      } else {
        this.codeMirror.setValue(nextProps.value);
      }
    }
    if (typeof nextProps.options === 'object') {
      for (let optionName in nextProps.options) {
        if (nextProps.options.hasOwnProperty(optionName)) {
          this.setOptionIfChanged(optionName, nextProps.options[optionName]);
        }
      }
    }
  }

  setOptionIfChanged(optionName: string, newValue: any) {
    const oldValue = this.codeMirror.getOption(optionName);
    if (!isEqual(oldValue, newValue)) {
      this.codeMirror.setOption(optionName, newValue);
    }
  }

  render() {
    const { name, path, value } = this.props;
    const editorClassName = [
      'ReactCodeMirror',
      this.state.isFocused ? 'ReactCodeMirror--focused' : null,
      this.props.className
    ].join(' ');
    if (this.codeMirror) {
      if (value != this.codeMirror.getValue()) {
        this.codeMirror.setValue(value);
      }
    }
    return (
      <div>
        <textarea
          ref={ref => this.textareaNode = ref}
          name={name || path}
          defaultValue={value}
          autoComplete="off"
          autoFocus={this.props.autoFocus}
          className={editorClassName}
        />
      </div>
    );
  }
};