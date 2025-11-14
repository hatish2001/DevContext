import { Router } from 'express';

const router = Router();

// TODO: Implement settings routes
router.get('/preferences', (req, res) => {
  res.json({ preferences: {} });
});

router.get('/notifications', (req, res) => {
  res.json({ notifications: {} });
});

export default router;
