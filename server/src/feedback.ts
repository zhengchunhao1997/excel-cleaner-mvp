import { Router, Request, Response } from 'express';
import { pool } from './db';
import { requireAdmin } from './adminAuth';

export const feedbackRouter = Router();

interface FeedbackItem {
  ts: string;
  clientId?: string;
  rating: number;
  comment: string;
  email?: string;
}

feedbackRouter.post('/feedback', (req: Request, res: Response) => {
  (async () => {
    const { rating, comment, email, clientId } = (req.body || {}) as Partial<FeedbackItem>;
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      res.status(400).json({ error: 'Invalid rating' });
      return;
    }
    const text = typeof comment === 'string' ? comment.trim() : '';
    if (!text) {
      res.status(400).json({ error: 'Comment required' });
      return;
    }

    const now = new Date();
    const ratingInt = Math.round(r);
    const commentText = text.slice(0, 4000);
    const emailText = typeof email === 'string' && email.trim() ? email.trim().slice(0, 200) : null;
    const clientIdText = typeof clientId === 'string' ? clientId.slice(0, 80) : null;

    await pool.query(
      `insert into feedback (ts, client_id, rating, comment, email) values (?, ?, ?, ?, ?)`,
      [now, clientIdText, ratingInt, commentText, emailText],
    );

    res.json({ ok: true });
  })().catch(() => res.status(500).json({ error: 'Failed to save feedback' }));
});

feedbackRouter.get('/feedback/stats', requireAdmin, (_req: Request, res: Response) => {
  (async () => {
    const countRes = await pool.query(`select count(*) as n from feedback`);
    const avgRes = await pool.query(`select avg(rating) as v from feedback`);
    const byRes = await pool.query(`select rating as rating, count(*) as n from feedback group by rating order by rating asc`);

    const count = Number((countRes.rows?.[0] as any)?.n ?? 0);
    const avgRaw = (avgRes.rows?.[0] as any)?.v as number | null | undefined;
    const avgRating = avgRaw === null || avgRaw === undefined ? null : Math.round(avgRaw * 100) / 100;
    const byRating: Record<string, number> = {};
    for (const row of byRes.rows as Array<{ rating: number; n: any }>) byRating[String(row.rating)] = Number(row.n ?? 0);

    res.json({ count, avgRating, byRating });
  })().catch((err) => {
    console.error('Feedback Stats Error:', err);
    res.status(500).json({ error: 'Failed to compute feedback stats' });
  });
});

feedbackRouter.get('/feedback/latest', requireAdmin, (req: Request, res: Response) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
  (async () => {
    const rows = await pool.query(
      `select ts, client_id as clientId, rating, comment, email from feedback order by ts desc limit ?`,
      [limit],
    );
    res.json({ items: rows.rows });
  })().catch((err) => {
    console.error('Feedback Latest Error:', err);
    res.status(500).json({ error: 'Failed to list feedback' });
  });
});
