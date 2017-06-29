import * as React from "react";
import { Grid, Row, Col, Button } from 'react-bootstrap';

import { settings } from '../../lib/settings';
import { s3url } from '../../lib/assets';
import { ReduxForm as ContactForm } from '../forms/contact';

import { Default as Layout, aligner } from '../lib';

export function Page(props: TMake.React.PageProps) {
	const { mq } = props;
	const { i18n, manifest } = settings;
	return (
		<Layout {...{ i18n, manifest, mq }}>
			<section id="section-contact" className="section" style={aligner.fullscreen as any}>
				<Grid>
					<Row>
						<Col sm={1} />
						<Col sm={10}>
							<h2 className="page-header text-center chroma info">Have a question?
              <div className="small">not in our <a target="_blank" href={`//chromafund.readthedocs.org`}>documentation</a>? let us know!</div>
							</h2>
						</Col>
					</Row>
					<Row>
						<Col sm={1} />
						<Col sm={10}>
							<ContactForm {...{ i18n, s3url, mq }} />
						</Col>
					</Row>
				</Grid>
			</section>
		</Layout>
	)
}