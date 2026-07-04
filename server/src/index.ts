import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initDb } from './db/schema';
import { playerRoutes } from './routes/players';
import { tournamentRoutes } from './routes/tournaments';
import { teamRoutes } from './routes/teams';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Express error handler — catches ALL unhandled errors in routes
// Must have 4 params for Express to recognize it as error middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] Unhandled route error:', err);
  if (!res.headersSent) {
    res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
  }
});

// Process-level handlers — log but don't crash
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception (continuing):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection (continuing):', reason);
});

// Start
async function start() {
  await initDb();
  console.log('Database initialized');

  app.listen(PORT, () => {
    console.log(`CS2 Tourney server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
