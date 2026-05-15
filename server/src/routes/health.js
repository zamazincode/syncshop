import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    name: 'SyncShop API',
    version: '1.0.0',
    status: 'running',
  });
});

export default router;
