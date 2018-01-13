import * as React from 'react';
import { Grid, Row, Col, Button, FormGroup, FormControl, ControlLabel, HelpBlock } from 'react-bootstrap';

import { gradients, aligner } from '../lib';

export class FormField extends React.Component<any, any> {
    getState(meta: any) {
        if (meta.dirty) {
            if (meta.error) {
                return 'error';
            } if (meta.warning) {
                return 'warning';
            }
            return 'success';
        }
        return null;
    }
    render() {
        const { placeholder, type, input, meta, children } = this.props;
        return (
            <FormGroup controlId={input.name} validationState={this.getState(meta)}>
                <ControlLabel>{children}</ControlLabel>
                <FormControl type={type} placeholder={placeholder} value={input.value} onChange={input.onChange} />
                <FormControl.Feedback style={aligner.form as any} />
                <HelpBlock>{meta.error || meta.warning || ''}</HelpBlock>
            </FormGroup>
        );
    }
}