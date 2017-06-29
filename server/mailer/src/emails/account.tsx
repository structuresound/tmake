import * as React from 'react';

import { Layout } from '../layouts/layout';
import { Header } from '../layouts/header';
import { Footer } from '../layouts/footer';
import { Panel, PanelBody, Empty } from '../components/panel';
import { A } from 'oy-vey';

const width = 490;

export function ResetPassword({ resetLink }: TMake.Email.Account.ResetPassword) {
    return (
        <Layout>
            <Header width={width} color="#ddd" backgroundColor="#fff" />
            <Panel width={width}>
                <PanelBody>
                    <Empty height={90} />
                    <Panel width={width * .8}>
                        <PanelBody align='center'>
                            Passwords are annoying. We'll try to make this as painless as possible . . .
                                <Empty height={10} />
                            Please <A style={{ fontWeight: 'bold', textDecoration: 'none' }}
                                href={resetLink}>Cick Here</A> to reset your password
                            </PanelBody>
                    </Panel>
                    <Empty height={90} />
                </PanelBody>
            </Panel>
            <Footer width={width} />
        </Layout>
    );
}

export function VerifyEmail({ validationLink, profile }: TMake.Email.Account.VerifyEmail) {
    return (
        <Layout>
            <Header width={width} color="#ddd" backgroundColor="#fff" />
            <Panel width={width}>
                <PanelBody>
                    <Empty height={90} />
                    <Panel width={width * .8}>
                        <PanelBody align='center'>
                            Thanks for signing up {profile.firstName}!
                                <Empty height={10} />
                            Please <A style={{ fontWeight: 'bold', textDecoration: 'none' }}
                                href={validationLink}>Cick here to verify</A> your email address
                            </PanelBody>
                    </Panel>
                    <Empty height={90} />
                </PanelBody>
            </Panel>
            <Footer width={width} />
        </Layout>
    );
}