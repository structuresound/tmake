import * as React from 'react';
import { Table, TBody, TR, TD } from 'oy-vey';

import { s3url } from '../lib/assets';

import { Empty } from '../components/panel';


export class Layout extends React.Component<any, any>{
  render() {
    const { children } = this.props;
    return (
      <Table
        width="100%"
        align="center"
        style={
          {
            WebkitTextSizeAdjust: '100%',
            msTextSizeAdjust: '100%',
            msoTableLspace: '0pt',
            msoTableRspace: '0pt',
            borderCollapse: 'collapse',
            margin: '0px auto',
            backgroundImage: `url(${s3url('emails/img/color-cycle.gif')})`,
            backgroundColor: '#2B2E34',
            backgroundPosition: 'top center',
            backgroundSize: '100% 100%'
          }
        }>
        <TBody>
          <TR>
            <TD align="center" style={{
              color: '#8d94a3', fontSize: '14px', fontFamily: 'QuesTRial, sans-serif', lineHeight: '22px'
            }}>
              {children}
            </TD>
          </TR>
        </TBody>
      </Table>
    );
  };
}