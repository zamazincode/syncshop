import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { env } from './config/env.js';
import { initGemini } from './lib/gemini.js';
import { createSocketServer } from './socket/index.js';
import healthRoutes from './routes/health.js';
import sessionRoutes from './routes/session.js';

// ═══════════════════════════════════════
// APP SETUP
// ═══════════════════════════════════════
const app = express();
const httpServer = createServer(app);

// Private Network Access headers (required for Chrome extension → localhost)
httpServer.prependListener('request', (req, res) => {
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
});

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════
app.use('/', healthRoutes);
app.use('/api/session', sessionRoutes);

// ═══════════════════════════════════════
// SOCKET.IO
// ═══════════════════════════════════════
createSocketServer(httpServer);

// ═══════════════════════════════════════
// AI INIT
// ═══════════════════════════════════════
initGemini();

// ═══════════════════════════════════════
// START
// ═══════════════════════════════════════
httpServer.listen(env.PORT, () => {
  console.log(`🚀 SyncShop Server running on port ${env.PORT}`);
});
