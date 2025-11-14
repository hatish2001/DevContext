import { Router } from 'express';
import { summaryService } from '../services/summaryService';

const router = Router();

router.post('/generate', async (req, res, next) => {
  try {
    const { userId, type } = req.body as { userId?: string; type?: 'daily' | 'weekly' };
    if (!userId || !type || (type !== 'daily' && type !== 'weekly')) {
      return res.status(400).json({ error: 'Missing or invalid userId/type' });
    }

    const summary = await summaryService.generate(userId, type);
    return res.json({ summary });
  } catch (error) {
    next(error);
  }
});

export default router;



