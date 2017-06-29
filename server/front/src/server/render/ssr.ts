import * as express from 'express';

export function mq(req: express.Request) {
    const mq: TMake.MediaQueryProps = {
        width: 1280,
        height: 720,
        screen: true
    }

    switch ((req as any).device.type) {
        case 'phone':
            mq.width = 320
            mq.height = 640
            break;
        case 'tablet':
            mq.width = 1280
            break;
        case 'desktop':
            mq.width = 1280
            break;
    }

    return mq;
}