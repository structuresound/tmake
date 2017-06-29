import { Router, Request, Response, NextFunction } from 'express';

import { healthz, testResults } from '../integration';

export class Healthz {
    router: Router

    /**
     * Initialize the TestRouter
     */
    constructor() {
        this.router = Router();
        this.init();
    }

    public get(req: Request, res: Response, next: NextFunction) {
        if (healthz()) {
            return res.status(200)
                .send({
                    message: 'healthy',
                    status: res.status
                });
        } else {
            return res.status(500)
                .send({
                    message: 'unhealthy',
                    status: res.status,
                    error: testResults
                });
        }
    }

    init() {
        this.router.get('/', this.get);
    }
}

// Create the HeroRouter, and export its configured Express.Router
const router = new Healthz();
router.init();

export const routes = router.router;