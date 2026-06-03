import { Router, Request, Response, NextFunction } from 'express';
import { MessageSchema } from './chat.schema';
import { postMessage } from './chat.service';
import { AppError } from '../../lib/errors';

const router = Router();

router.post('/message', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = MessageSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request body.';
    return next(new AppError(message, 400));
  }

  try {
    const { message, sessionId } = parsed.data;
    const result = await postMessage(message, sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
