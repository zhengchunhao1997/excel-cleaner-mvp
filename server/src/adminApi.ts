import { Router, Request, Response } from 'express';
import { requireAdmin } from './adminAuth';
import { parseJson, pool } from './db';
import { getAllConfig, setConfigNumber, defaultConfig, ConfigKey } from './config';
import { verifyAccessToken } from './auth';

export const adminApiRouter = Router();

adminApiRouter.get('/admin/config', requireAdmin, (_req: Request, res: Response) => {
  (async () => {
    const config = await getAllConfig();
    res.json({ config });
  })().catch((err) => {
    console.error('Admin API Error (/admin/config GET):', err);
    res.status(500).json({ error: 'Failed to load config' });
  });
});

adminApiRouter.put('/admin/config', requireAdmin, (req: Request, res: Response) => {
  (async () => {
    const { key, value, values } = (req.body || {}) as { key?: string; value?: unknown; values?: Record<string, unknown> };

    const allowedKeys = new Set(Object.keys(defaultConfig));

    if (values && typeof values === 'object') {
      for (const [k, v] of Object.entries(values)) {
        if (!allowedKeys.has(k)) continue;
        await setConfigNumber(k as ConfigKey, Number(v));
      }
      const config = await getAllConfig();
      res.json({ ok: true, config });
      return;
    }

    if (!key || !allowedKeys.has(key)) {
      res.status(400).json({ error: 'Invalid key' });
      return;
    }

    await setConfigNumber(key as ConfigKey, Number(value));
    const config = await getAllConfig();
    res.json({ ok: true, config });
  })().catch((e) => {
    console.error('Admin API Error (/admin/config PUT):', e);
    res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid value' });
  });
});

adminApiRouter.get('/admin/events', requireAdmin, (req: Request, res: Response) => {
  (async () => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const type = typeof req.query.type === 'string' ? req.query.type.trim() : '';
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId.trim() : '';

    const where: string[] = [];
    const params: any[] = [];
    if (type) {
      where.push(`type = ?`);
      params.push(type);
    }
    if (clientId) {
      where.push(`client_id = ?`);
      params.push(clientId);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const rowsRes = await pool.query(
      `select id, ts, type, client_id as "clientId", props
       from telemetry_events
       ${whereSql}
       order by ts desc
       limit ? offset ?`,
      [...params, limit, offset],
    );

    const countRes = await pool.query(
      `select count(*) as n
       from telemetry_events
       ${whereSql}`,
      params,
    );

    const items = (rowsRes.rows as Array<any>).map((r) => ({ ...r, props: parseJson(r.props) ?? r.props }));
    res.json({ total: Number((countRes.rows?.[0] as any)?.n ?? 0), limit, offset, items });
  })().catch((err) => {
    console.error('Admin API Error (/admin/events):', err);
    res.status(500).json({ error: 'Failed to list events' });
  });
});

adminApiRouter.get('/admin/clients', requireAdmin, (req: Request, res: Response) => {
  (async () => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const where: string[] = [];
    const params: any[] = [];
    if (q) {
      where.push(`lower(client_id) like ?`);
      params.push(`%${q.toLowerCase()}%`);
    }
    const whereSql = where.length ? `where ${where.join(' and ')}` : '';

    const rowsRes = await pool.query(
      `select
         c.client_id as "clientId",
         c.first_seen as "firstSeen",
         c.last_seen as "lastSeen",
         (select count(*) from telemetry_events e where e.client_id = c.client_id) as "eventCount",
         (select count(*) from telemetry_events e where e.client_id = c.client_id and e.type = 'suggest_mapping_success') as "analyzeCount",
         (select count(*) from telemetry_events e where e.client_id = c.client_id and e.type = 'export') as "exportCount",
         (select count(*) from feedback f where f.client_id = c.client_id) as "feedbackCount"
       from clients c
       ${whereSql}
       order by c.last_seen desc
       limit ? offset ?`,
      [...params, limit, offset],
    );

    const countRes = await pool.query(
      `select count(*) as n
       from clients
       ${whereSql}`,
      params,
    );

    const items = (rowsRes.rows as Array<any>).map((r) => ({
      ...r,
      eventCount: Number(r.eventCount ?? 0),
      analyzeCount: Number(r.analyzeCount ?? 0),
      exportCount: Number(r.exportCount ?? 0),
      feedbackCount: Number(r.feedbackCount ?? 0),
    }));
    res.json({ total: Number((countRes.rows?.[0] as any)?.n ?? 0), limit, offset, items });
  })().catch((err) => {
    console.error('Admin API Error (/admin/clients):', err);
    res.status(500).json({ error: 'Failed to list clients' });
  });
});

adminApiRouter.get('/admin/calls', requireAdmin, (req: Request, res: Response) => {
  (async () => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const endpoint = typeof req.query.endpoint === 'string' ? req.query.endpoint.trim() : '';
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId.trim() : '';
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';

    const where: string[] = [];
    const params: any[] = [];
    if (endpoint) {
      where.push(`endpoint = ?`);
      params.push(endpoint);
    }
    if (clientId) {
      where.push(`client_id = ?`);
      params.push(clientId);
    }
    if (userId) {
      where.push(`user_id = ?`);
      params.push(userId);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const rowsRes = await pool.query(
      `select id, ts, user_id as "userId", client_id as "clientId", endpoint, status_code as "statusCode", duration_ms as "durationMs",
              request_meta as "requestMeta", response_meta as "responseMeta", error
       from api_calls
       ${whereSql}
       order by ts desc
       limit ? offset ?`,
      [...params, limit, offset],
    );

    const countRes = await pool.query(
      `select count(*) as n
       from api_calls
       ${whereSql}`,
      params,
    );

    const items = (rowsRes.rows as Array<any>).map((r) => ({
      ...r,
      requestMeta: parseJson(r.requestMeta) ?? r.requestMeta,
      responseMeta: parseJson(r.responseMeta) ?? r.responseMeta,
    }));
    res.json({ total: Number((countRes.rows?.[0] as any)?.n ?? 0), limit, offset, items });
  })().catch((err) => {
    console.error('Admin API Error (/admin/calls):', err);
    res.status(500).json({ error: 'Failed to list calls' });
  });
});

adminApiRouter.get('/admin/users', requireAdmin, (req: Request, res: Response) => {
  (async () => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const where: string[] = [];
    const params: any[] = [];
    if (q) {
      where.push(`lower(email) like ?`);
      params.push(`%${q.toLowerCase()}%`);
    }
    const whereSql = where.length ? `where ${where.join(' and ')}` : '';

    const rowsRes = await pool.query(
      `select
         id, email, plan,
         daily_analyze_limit as "dailyAnalyzeLimit",
         daily_export_limit as "dailyExportLimit",
         created_at as "createdAt",
         last_login_at as "lastLoginAt"
       from users
       ${whereSql}
       order by created_at desc
       limit ? offset ?`,
      [...params, limit, offset],
    );

    const countRes = await pool.query(
      `select count(*) as n
       from users
       ${whereSql}`,
      params,
    );

    res.json({ total: Number((countRes.rows?.[0] as any)?.n ?? 0), limit, offset, items: rowsRes.rows });
  })().catch((err) => {
    console.error('Admin API Error (/admin/users):', err);
    res.status(500).json({ error: 'Failed to list users' });
  });
});

adminApiRouter.put('/admin/users/:id/limits', requireAdmin, (req: Request, res: Response) => {
  (async () => {
    const id = String(req.params.id || '').trim();
    const dailyAnalyzeLimit = Number((req.body || {}).dailyAnalyzeLimit);
    const dailyExportLimit = Number((req.body || {}).dailyExportLimit);
    if (!id) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    if (!Number.isFinite(dailyAnalyzeLimit) || dailyAnalyzeLimit < 0) {
      res.status(400).json({ error: 'Invalid dailyAnalyzeLimit' });
      return;
    }
    if (!Number.isFinite(dailyExportLimit) || dailyExportLimit < 0) {
      res.status(400).json({ error: 'Invalid dailyExportLimit' });
      return;
    }
    await pool.query(
      `update users set daily_analyze_limit = ?, daily_export_limit = ? where id = ?`,
      [Math.floor(dailyAnalyzeLimit), Math.floor(dailyExportLimit), id],
    );
    res.json({ ok: true });
  })().catch((err) => {
    console.error('Admin API Error (/admin/users/:id/limits):', err);
    res.status(500).json({ error: 'Failed to update user' });
  });
});

adminApiRouter.get('/admin/me', requireAdmin, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  if (adminUser) {
    res.json({ user: adminUser });
  } else {
    // 理论上 requireAdmin 已经处理了 401，但为了安全这里加个保底
    res.status(401).json({ error: 'Unauthorized' });
  }
});
