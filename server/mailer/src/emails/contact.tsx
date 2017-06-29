import * as React from 'react';

import { Layout } from '../layouts/layout';
import { Header } from '../layouts/header';
import { Footer } from '../layouts/footer';
import { Panel, PanelBody, Empty } from '../components/panel';
import { A } from 'oy-vey';

import { settings } from '../lib';

const width = 490;

export function Contact({ email, name, body }: TMake.Email.Form.Contact) {
  const { title } = settings.i18n;
  return (
    <Layout>
      <Header width={width} color="#ddd" backgroundColor="#fff" />
      <Panel width={width}>
        <PanelBody>
          <Empty height={90} />
          <Panel width={width * .8}>
            <PanelBody align='center'>
              <p>dear {title} staff</p>
              <p>we have a contact request from: {name}</p>
              <p>please reply to: {email}</p>
              <p>begin message:</p>
              <p>{body}</p>
            </PanelBody>
          </Panel>
          <Empty height={90} />
        </PanelBody>
      </Panel>
      <Footer width={width} />
    </Layout>
  );
}
