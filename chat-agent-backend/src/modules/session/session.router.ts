import { Router, Request, Response, NextFunction } from 'express';
import { getHistory } from './session.service';

const router = Router();

router.get('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getHistory(req.params.sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
