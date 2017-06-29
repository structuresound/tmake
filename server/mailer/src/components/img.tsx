import * as React from 'react';
import * as Oy from 'oy-vey';
import { clone } from 'typed-json-transform';

export class Img extends React.Component<any, any>{
    render() {
        const childProps = clone(this.props);
        delete childProps.children;
        if (!childProps.style) {
            childProps.style = {
                color: '#111',
                fontSize: '36px',
                fontFamily: 'sans-serif'
            }
        }
        return (
            <Oy.Img {...childProps} />
        );
    }
}