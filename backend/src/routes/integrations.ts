import { Router } from 'express';

const router = Router();

// TODO: Implement integration routes
router.get('/', (req, res) => {
  res.json({ integrations: [] });
});

export default router;
