import * as React from "react";

interface ParallaxProps {
    speed?: number,
    stretch?: {
        x?: number,
        y?: number
    }
    children?: any,
    // Style
    width?: string,
    top?: string,
    left?: number,
    right?: string
}

interface Window {
    addEventListener<K extends keyof WindowEventMap>(type: K, listener: (this: Window, ev: WindowEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
    readonly pageYOffset: number;
}


class Parallax extends React.Component<ParallaxProps, any> {
    static defaultProps = {
        position: 'fixed',
        width: 'auto',
        height: 'auto',
        top: 'inherit',
        left: 'inherit',
        right: 'inherit',
        speed: .36,
        stretch: {},
    }

    constructor(props: any) {
        super(props);
        this.handleScroll = this.handleScroll.bind(this);
    }

    componentDidMount() {
        window.addEventListener('scroll', this.handleScroll);
    }

    componentWillUnmount() {
        window.removeEventListener('scroll', this.handleScroll);
    }

    getTop() {
        const top = this.props.top;
        return top.indexOf('vh') > -1
            ? parseInt(top.replace('vh', ''))
            : parseInt(top, 10);
    }

    handleScroll() {
        const speed = this.props.speed;
        const top = this.getTop();
        // Top positons
        const pageTop = window.pageYOffset;
        const newTop = top - (pageTop * speed);
        // Set new top position
        const refs: any = this.refs;
        refs.parallaxElement.style.top = `${newTop}vh`;
        if (this.props.stretch) {

        }
    }

    render() {
        return (
            <div
                ref="parallaxElement"
                style={{ ...this.props }}
            >
                <div>
                    {this.props.children}
                </div>
            </div>
        );
    }
}

export {
    Parallax
}