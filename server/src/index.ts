import express from 'express';
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
