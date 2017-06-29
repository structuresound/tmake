import * as React from 'react';
import { Table, TBody, TD, TR, Img } from 'oy-vey';

import { s3url } from '../lib/assets';

interface GridProps {
    color?: string;
    backgroundColor?: string;
    width?: number;
    lengthClass?: string;
    height?: number;
    borderRadius?: number;
}

export class Panel extends React.Component<GridProps, any>{
    render() {
        let { width, color, backgroundColor, borderRadius, lengthClass, children } = this.props;
        if (!backgroundColor) {
            backgroundColor = '#fff';
        }
        if (!color) {
            color = '#111';
        }
        return (
            <Table className={`${lengthClass || 'panel'}`} align="center" border="0" cellpadding="0" cellspacing="0"
                style={{ backgroundColor, borderTopLeftRadius: `${borderRadius || 0}px`, borderTopRightRadius: `${borderRadius || 0}px` }}
                width={width || 0}>
                <TBody>
                    {children}
                </TBody>
            </Table>
        )
    }
}

export class PanelSpacer extends React.Component<{ height: number }, any>{
    render() {
        const { height } = this.props;
        return (
            <TR>
                <TD height={height || 0} style={{ fontSize: `${height || 0}px`, lineHeight: `${height || 0}px` }}>&nbsp;</TD>
            </TR>
        );
    }
}

export class PanelBody extends React.Component<any, any>{
    render() {
        return (
            <TR>
                <TD {...this.props}>{this.props.children}</TD>
            </TR>
        );
    }
}

export class Empty extends React.Component<{ height: number }, any>{
    render() {
        const { height } = this.props;
        return (
            <Table>
                <TBody>
                    <PanelSpacer {...this.props} />
                </TBody>
            </Table>)
    }
}