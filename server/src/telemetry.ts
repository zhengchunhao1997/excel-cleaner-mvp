import { Router, Request, Response } from 'express';
import { parseJson, pool, toJson } from './db';
import { StatsPeriod, toBucketKey } from './statsBuckets';
import { requireAdmin } from './adminAuth';

export const telemetryRouter = Router();

type EventType =
  | 'upload'
  | 'analyze_start'
  | 'analyze_success'
  | 'analyze_failure'
  | 'export'
  | 'open_docs'
  | 'toggle_language'
  | 'feedback_submit';

interface TelemetryEvent {
  type: EventType;
  ts: string;
  clientId?: string;
  props?: Record<string, unknown>;
}

const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const startOfUtcMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

const startOfUtcWeekMonday = (d: Date) => {
  const base = startOfUtcDay(d);
  const day = base.getUTCDay() || 7;
  base.setUTCDate(base.getUTCDate() - (day - 1));
  return base;
};

const addUtcMonths = (d: Date, months: number) => {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
  return out;
};

const addUtcDays = (d: Date, days: number) => {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
};

const addUtcWeeks = (d: Date, weeks: number) => addUtcDays(d, weeks * 7);

const computeSince = (period: StatsPeriod, count: number) => {
  const now = new Date();
  if (period === 'day') return addUtcDays(startOfUtcDay(now), -(count - 1));
  if (period === 'week') return addUtcWeeks(startOfUtcWeekMonday(now), -(count - 1));
  return addUtcMonths(startOfUtcMonth(now), -(count - 1));
};

telemetryRouter.post('/events', (req: Request, res: Response) => {
  (async () => {
    const { type, ts, clientId, props } = (req.body || {}) as Partial<TelemetryEvent>;
    const allowed: Set<string> = new Set([
      'upload',
      'analyze_start',
      'analyze_success',
      'analyze_failure',
      'export',
      'open_docs',
      'toggle_language',
      'feedback_submit',
    ]);

    if (!type || !allowed.has(type)) {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }

    const iso = ts && typeof ts === 'string' ? ts : new Date().toISOString();
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      res.status(400).json({ error: 'Invalid ts' });
      return;
    }

    const clientIdText = typeof clientId === 'string' ? clientId.slice(0, 80) : null;
    if (clientIdText) {
      await pool.query(
        `insert into clients (client_id, first_seen, last_seen)
         values (?, ?, ?)
         on duplicate key update last_seen = values(last_seen)`,
        [clientIdText, d, d],
      );
    }

    await pool.query(
      `insert into telemetry_events (ts, type, client_id, props) values (?, ?, ?, cast(? as json))`,
      [
        d,
        type,
        clientIdText,
        toJson(props && typeof props === 'object' ? props : null),
      ],
    );

    res.json({ ok: true });
  })().catch(() => res.status(500).json({ error: 'Failed to write event' }));
});

telemetryRouter.get('/stats', requireAdmin, (req: Request, res: Response) => {
  const period = String(req.query.period || 'day') as StatsPeriod;
  const count = Math.max(1, Math.min(120, Number(req.query.count || 14)));
  const allowedPeriods = new Set(['day', 'week', 'month']);
  if (!allowedPeriods.has(period)) {
    res.status(400).json({ error: 'Invalid period' });
    return;
  }

  (async () => {
    const since = computeSince(period, count);

    const eventsRes = await pool.query(
      `select ts, type, client_id as clientId, props from telemetry_events where ts >= ? order by ts asc`,
      [since],
    );

    const bucketMap = new Map<string, { key: string; total: number; uniqueClients: number; byType: Record<string, number>; exports: Record<string, number> }>();
    const totals: Record<string, number> = {};
    const exportsTotals: Record<string, number> = {};
    const uniqueClientSet = new Set<string>();
    const bucketClientSets = new Map<string, Set<string>>();

    for (const row of eventsRes.rows as Array<{ ts: string | Date; type: string; clientId: string | null; props: unknown }>) {
      const tsDate = row.ts instanceof Date ? row.ts : new Date(row.ts);
      const key = toBucketKey(tsDate, period);
      const b = bucketMap.get(key) || { key, total: 0, uniqueClients: 0, byType: {}, exports: {} };
      b.total += 1;
      b.byType[row.type] = (b.byType[row.type] || 0) + 1;
      totals[row.type] = (totals[row.type] || 0) + 1;

      if (row.clientId) {
        uniqueClientSet.add(row.clientId);
        const set = bucketClientSets.get(key) || new Set<string>();
        set.add(row.clientId);
        bucketClientSets.set(key, set);
      }

      if (row.type === 'export') {
        const propsObj = parseJson<Record<string, any>>(row.props) || {};
        const mode = typeof propsObj.mode === 'string' ? propsObj.mode : null;
        if (mode) {
          b.exports[mode] = (b.exports[mode] || 0) + 1;
          exportsTotals[mode] = (exportsTotals[mode] || 0) + 1;
        }
      }

      bucketMap.set(key, b);
    }

    for (const [key, set] of bucketClientSets.entries()) {
      const b = bucketMap.get(key);
      if (b) b.uniqueClients = set.size;
    }

    const buckets = Array.from(bucketMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    const uniqueClients = uniqueClientSet.size;

    res.json({
      period,
      count,
      totals,
      exportsTotals,
      uniqueClients,
      buckets,
    });
  })().catch((err) => {
    console.error('Telemetry Stats Error:', err);
    res.status(500).json({ error: 'Failed to compute stats' });
  });
});
