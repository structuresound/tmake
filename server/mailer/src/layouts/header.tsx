import * as React from 'react';
import { Table, TBody, TD, TR } from 'oy-vey';

import { s3url } from '../lib/assets';

import { Panel, PanelBody, PanelSpacer, Empty } from '../components/panel';
import { Img } from '../components/img';

export class Header extends React.Component<any, any>{
  render() {
    const { width, color, backgroundColor } = this.props;

    const style = {
      color: color,
      fontWeight: 'bold'
    };

    return (
      <Table
        width="100%"
        align="center" border="0" cellpadding="0" cellspacing="0"
        color={color}>
        <TBody>
          <TR>
            <TD>
              <Empty height={90} />
              <Panel lengthClass='panel3' width={width * .925}><PanelSpacer height={3} /></Panel>
              <Empty height={3} />
              <Panel lengthClass='panel2' width={width * .95}><PanelSpacer height={3} /></Panel>
              <Empty height={3} />
              <Panel lengthClass='panel1' width={width * .975}><PanelSpacer height={3} /></Panel>
              <Empty height={3} />
              <Panel width={width}>
                <PanelBody align="center">
                  <Empty height={45} />
                  <Img alt="logo" border={0} src={s3url('emails/img/Chroma_Logo_Dark.png')} width={200} height={51} />
                  <Empty height={30} />
                </PanelBody>
              </Panel>
            </TD>
          </TR>
        </TBody>
      </Table >
    );
  };
}