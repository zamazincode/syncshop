import { Router } from 'express';
import { createSession, joinSession, getSession } from '../services/session.js';

const router = Router();

// Get session by code
router.get('/:code', async (req, res) => {
  const session = await getSession(req.params.code);
  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı.' });
  res.json(session);
});

// Create new session
router.post('/', async (req, res) => {
  try {
    const { category } = req.body;
    const { session, userId } = await createSession(category);
    res.json({ session, userId });
  } catch (err) {
    console.error('[Route] Create session error:', err);
    res.status(500).json({ error: 'Oturum oluşturulamadı.' });
  }
});

// Join existing session
router.post('/:code/join', async (req, res) => {
  const { userName } = req.body;
  const result = await joinSession(req.params.code, userName);

  if (result.error) return res.status(404).json(result);
  res.json({ session: result.session, userId: result.userId });
});

export default router;
