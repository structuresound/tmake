import * as React from "react";
import { Link } from 'react-router-dom';
import { Grid, Row, Col, Button, Image } from 'react-bootstrap';

export function Footer(props: TMake.React.LayoutProps) {
    const { s3url, i18n } = props;
    const { name, title } = i18n;
    return (<div>
        <footer id="footer">
            <Grid>
                <div id="footer-links">
                    <Row className="sm-center xs-center">
                        <Col sm={1} />
                        <Col sm={11}>
                            <Col sm={4}>
                                <h3 className="page-header">Developer
                                    <ul className="small">
                                        <li>
                                            <a target="_blank" href={`https://github.com/structuresound/tmake`}>Github <i className="fa fa-3x fa-github" /></a>
                                        </li>
                                        <li>
                                            <a target="_blank" href="https://travis-ci.org/structuresound/tmake">
                                                TrieMake <Image src="https://travis-ci.org/structuresound/tmake.svg?branch=master" />
                                            </a>
                                        </li>
                                        <li>
                                            <a target="_blank" href="https://travis-ci.org/1e1f/js-moss">
                                                Moss <Image src="https://travis-ci.org/1e1f/js-moss.svg?branch=master" />
                                            </a>
                                        </li>
                                    </ul>
                                </h3>
                            </Col>
                            <Col sm={4}>
                                <h3 className="page-header">Site
                                    <ul className="small">
                                        <li><Link to={`/moss/playground`}>moss</Link></li>
                                    </ul>
                                </h3>
                            </Col>
                            <Col sm={4}>
                                <h3 className="page-header">Help
                                    <ul className="small">
                                        <li><Link to={`/about`}>team</Link></li>
                                        <li><Link to={`/contact`}>Contact Us</Link></li>
                                    </ul>
                                </h3>
                            </Col>
                        </Col>
                    </Row>
                </div>
            </Grid>
            <div id="footer-legal">
                <Grid>
                    <Row>
                        <Col sm={12}>
                            <div className="legal">
                                <div className="pull-right">
                                    copyright {new Date().getFullYear()}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Grid>
            </div>
        </footer>
    </div>)
}