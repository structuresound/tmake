import * as React from 'react';

import { Layout } from '../layouts/layout';
import { Header } from '../layouts/header';
import { Footer } from '../layouts/footer';
import { Panel, PanelBody, Empty } from '../components/panel';
import { A } from 'oy-vey';

export function Test(props: any) {
    return (
        <Layout>
            <Header color="#ddd" backgroundColor="#fff" />
            <Panel width={490}>
                <PanelBody>
                    <Empty height={90} />
                    test
                        <Empty height={90} />
                </PanelBody>
            </Panel>
            {/*<Footer />*/}
        </Layout>
    );
}

export function NotFound(props: any) {
    return (
        <Layout>
            <Header color="#ddd" backgroundColor="#fff" />
            <Panel width={490}>
                <PanelBody>
                    <Empty height={90} />
                    email template was not found
                    check props matching {JSON.stringify(props, [], 2)}
                    <Empty height={90} />
                </PanelBody>
            </Panel>
            {/*<Footer />*/}
        </Layout>
    );
}