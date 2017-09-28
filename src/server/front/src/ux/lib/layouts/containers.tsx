import * as React from "react";
import { Grid, Row, Col, Button } from 'react-bootstrap';
import * as MediaQuery from 'react-responsive';

interface SpacerProps {
    mq?: TMake.MediaQueryProps
    mobileHeight?: number
    desktopHeight?: number
    height?: number
}

interface MatteBoxProps {
    mq?: TMake.MediaQueryProps
    margin?: number
    children?: any
}

export function spacerStyle(height: number, isDesktop?: boolean) {
    if (isDesktop) {
        switch (height) {
            default:
            case 1: return {
                height: '15px'
            }
            case 2: return {
                height: '30px'
            }
            case 3: return {
                height: '60px'
            }
        }
    }
    switch (height) {
        default:
        case 1: return {
            height: '2vh'
        }
        case 2: return {
            height: '4vh'
        }
        case 3: return {
            height: '6vh'
        }
    }
}

export function matteBoxStyle(margin: number, layout?: string) {
    switch (layout) {
        case 'wide': {
            switch (margin) {
                default:
                case 1: return {
                    marginTop: '5vh',
                    marginLeft: '5vw',
                    marginRight: '5vw',
                    marginBottom: '10vh'
                }
                case 2: return {
                    marginTop: '5vh',
                    marginLeft: '15vw',
                    marginRight: '15vw',
                    marginBottom: '15vh'
                }
                case 3: return {
                    marginTop: '5vh',
                    marginLeft: '22vw',
                    marginRight: '22vw',
                    marginBottom: '15vh'
                }
            }
        }
        case 'medium': {
            switch (margin) {
                default:
                case 1: return {
                    marginTop: '5vh',
                    marginLeft: '3vw',
                    marginRight: '3vw',
                    marginBottom: '10vh'
                }
                case 2: return {
                    marginTop: '5vh',
                    marginLeft: '8vw',
                    marginRight: '8vw',
                    marginBottom: '15vh'
                }
                case 3: return {
                    marginTop: '5vh',
                    marginLeft: '12vw',
                    marginRight: '12vw',
                    marginBottom: '10vh'
                }
            }
        }
        default:
        case 'narrow': {
            switch (margin) {
                default: return {
                    marginTop: '2vh',
                    marginLeft: '2vw',
                    marginRight: '2vw',
                    marginBottom: '4vh'
                }
            }
        }
    }
}

export function Spacer(props: SpacerProps) {
    const { mq, mobileHeight, desktopHeight, height } = props;
    return <div>
        <MediaQuery minWidth={1024} values={mq}>
            <div style={spacerStyle(desktopHeight || height, true)} />
        </MediaQuery>
        <MediaQuery maxWidth={1024} values={mq}>
            <div style={spacerStyle(desktopHeight || height)} />
        </MediaQuery>
    </div>
}

export function MatteBox(props: MatteBoxProps) {
    const { mq, margin } = props;
    return <div>
        <MediaQuery minWidth={1280} values={mq}>
            <div style={matteBoxStyle(margin, 'wide')}>
                {props.children}
            </div>
        </MediaQuery>
        <MediaQuery minWidth={768} maxWidth={1280} values={mq}>
            <div style={matteBoxStyle(margin, 'medium')}>
                {props.children}
            </div>
        </MediaQuery>
        <MediaQuery maxWidth={768} values={mq}>
            <div style={matteBoxStyle(margin)}>
                {props.children}
            </div>
        </MediaQuery>
    </div>
}