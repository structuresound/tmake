import * as React from "react";
import { Grid, Row, Col, Button } from 'react-bootstrap';
import * as MediaQuery from 'react-responsive';

import { Navbar } from '../components';
import { Footer } from '../components';
import { aligner } from '../styles';
import { MatteBox } from './containers';

export function Default(props: TMake.React.LayoutProps) {
    return (
        <div>
            <Navbar {...props} />
            <Grid fluid={props.fluid}>
                <Row>
                    <Col xs={12} md={1} />
                    <Col xs={12} md={10}>
                        <Row>
                            {props.children}
                        </Row>
                    </Col>
                </Row>
            </Grid>
            <Footer {...props} />
        </div>
    )
}

export function Fullscreen(props: TMake.React.LayoutProps) {
    return (
        <div>
            <Navbar {...props} />
            {props.children}
            <Footer {...props} />
        </div>
    )
}

export function Page(props: TMake.React.LayoutProps) {
    return (
        <div>
            <Navbar {...props} />
            <MatteBox margin={3} mq={props.mq}>
                {props.children}
            </MatteBox>
            <Footer {...props} />
        </div >
    )
}


export function Center(props: TMake.React.LayoutProps) {
    return (
        <div>
            <Navbar {...props} />
            <div style={aligner.fullscreen as any}>
                <div>
                    {props.children}
                </div>
            </div>
            <Footer {...props} />
        </div>
    )
}

export function Modal(props: TMake.React.LayoutProps) {
    return (
        <div>
            <Navbar {...props} />
            <div style={{ minHeight: '70vh' }}>
                <div style={aligner.withHeight('50vh') as any}>
                    <div>
                        {props.children}
                    </div>
                </div>
            </div>
            <Footer {...props} />
        </div >
    )
}