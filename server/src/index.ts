import express from 'express';
import cors from 'cors';
import { suggestMappingRouter } from './routes';
import { telemetryRouter } from './telemetry';
import { feedbackRouter } from './feedback';
import { serveAdminPage } from './adminPage';
import { requireAdmin } from './adminAuth';
import { initDb } from './db';
import { adminApiRouter } from './adminApi';
import { authRouter } from './authRoutes';
import { loadEnv } from './env';
import { pool } from './db';
import { hashPassword } from './auth';
import crypto from 'node:crypto';

loadEnv();

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : undefined;
app.use(corsOrigin ? cors({ origin: corsOrigin }) : cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Routes
app.use('/api', authRouter);
app.use('/api', suggestMappingRouter);
app.use('/api', telemetryRouter);
app.use('/api', feedbackRouter);
app.use('/api', adminApiRouter);

app.get('/admin', serveAdminPage);

// Health check
app.get('/', (req, res) => {
  res.send('execelMerge API is running');
});

(async () => {
  await initDb();
  const adminEmail = String(process.env.ADMIN_DEFAULT_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_DEFAULT_PASSWORD || '').trim();
  if (adminEmail && adminPassword) {
    const found = await pool.query(`select id from users where email = ?`, [adminEmail]);
    if (!found.rows[0]) {
      const passwordHash = await hashPassword(adminPassword);
      await pool.query(
        `insert into users (id, email, password_hash, plan, daily_analyze_limit, daily_export_limit, created_at)
         values (?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), adminEmail, passwordHash, 'admin', 1000000, 1000000, new Date()],
      ).catch(() => {});
    }
  }
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})().catch((e) => {
  console.error('Failed to start server', e);
  process.exit(1);
});
