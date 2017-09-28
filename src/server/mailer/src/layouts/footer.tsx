import * as React from 'react';
import { Table, TBody, TD, TR } from 'oy-vey';

import { s3url, settings } from '../lib';

import { Panel, PanelBody, PanelSpacer, Empty } from '../components/panel';
import { Img } from '../components/img';

const copyrightYear = new Date().getFullYear();

export class Footer extends React.Component<any, any>{
  render() {
    const { twitter, facebook } = settings;
    const { title } = settings.i18n;
    const { width } = this.props;
    return (
      <div>
        <Panel width={width}>
          <PanelSpacer height={30} />
          <TR>
            <TD align='center'>
              <a href={`http://facebook.com/${facebook.account}/`} style={{
                display: 'block',
                width: 100,
                height: 15,
                borderStyle: 'none !important',
                border: '0 !important'
              }} />
            </TD>
            <TD align='center'>
              <a href={`http://facebook.com/${facebook.account}/`} style={{
                display: 'block',
                width: 25,
                height: 15,
                borderStyle: 'none !important',
                border: '0 !important'
              }}>
                <Img alt="like us on facebook" border={0} src={s3url('emails/img/facebook.png')} width={6} height={12} /></a>
            </TD>
            <TD align='center'>
              <a href={`http://facebook.com/${twitter.account}/`} style={{
                display: 'block',
                width: 25,
                height: 15,
                borderStyle: 'none !important',
                border: '0 !important'
              }}>
                <Img alt="follow us on twitter" border={0} src={s3url('emails/img/twitter.png')} width={13} height={10} /></a>
            </TD>
            <TD align='center'>
              <a href={`http://facebook.com/${twitter.account}/`} style={{
                display: 'block',
                width: 100,
                height: 15,
                borderStyle: 'none !important',
                border: '0 !important'
              }} />
            </TD>
          </TR>
          <PanelSpacer height={30} />
        </Panel>
        <Empty height={90} />
        <Table align="center" border="0" cellpadding="0" cellspacing="0">
          <TBody>
            <TR>
              <TD align="center" style={{
                color: '#8d94a3', fontSize: '14px', fontFamily: 'QuesTRial, sans-serif', lineHeight: '15px'
              }}>
                <div>© {copyrightYear} {title} All Rights Reserved.</div>
              </TD>
            </TR>
            <PanelSpacer height={20} />
          </TBody>
        </Table>
      </div >
    );
  }
}