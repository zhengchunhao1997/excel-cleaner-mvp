import { Router, Request, Response } from 'express';
import { generateMapping, MappingRequest, generateAiClean, AiCleanRequest } from './aiService';
import { pool, toJson } from './db';
import { getConfigNumber } from './config';
import { authRequired, AuthedRequest } from './authMiddleware';

export const suggestMappingRouter = Router();

suggestMappingRouter.post('/suggest-mapping', authRequired, async (req: AuthedRequest, res: Response) => {
  const startedAt = Date.now();
  const authed = req.auth!;

  try {
    const { files } = req.body as MappingRequest;
    const clientIdHeader = String(req.header('x-client-id') || '').trim();
    const clientId = clientIdHeader ? clientIdHeader.slice(0, 80) : null;

    if (!files || !Array.isArray(files) || files.length < 1) {
      res.status(400).json({ error: 'Please provide at least 1 file with headers.' });
      return; 
    }

    const now = new Date();
    if (clientId) {
      await pool.query(
        `insert into clients (client_id, first_seen, last_seen)
         values (?, ?, ?)
         on duplicate key update last_seen = values(last_seen)`,
        [clientId, now, now],
      );
    }

    const fileCount = files.length;
    const headerCounts = files.map((f) => Array.isArray(f.headers) ? f.headers.length : 0);

    await pool.query(
      `insert into telemetry_events (ts, type, client_id, props) values (?, ?, ?, cast(? as json))`,
      [now, 'suggest_mapping_start', clientId, toJson({ fileCount, headerCounts })],
    );

    const dailyLimit = authed
      ? Number((await pool.query(`select daily_analyze_limit as n from users where id = ?`, [authed.userId])).rows?.[0]?.n ?? 0)
      : await getConfigNumber('free_analyze_daily_limit');

    if (dailyLimit > 0 && (authed || clientId)) {
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const usedRes = authed
        ? await pool.query(
          `select count(*) as n
           from api_calls
           where endpoint = 'suggest_mapping' and status_code = 200 and user_id = ? and ts >= ?`,
          [authed.userId, dayStart],
        )
        : await pool.query(
          `select count(*) as n
           from api_calls
           where endpoint = 'suggest_mapping' and status_code = 200 and client_id = ? and ts >= ?`,
          [clientId, dayStart],
        );
      const used = Number((usedRes.rows?.[0] as any)?.n ?? 0);
      if (used >= dailyLimit) {
        await pool.query(
          `insert into telemetry_events (ts, type, client_id, props) values (?, ?, ?, cast(? as json))`,
          [new Date(), 'suggest_mapping_quota_blocked', clientId, toJson({ dailyLimit, used, userId: authed?.userId })],
        );
        await pool.query(
          `insert into api_calls (ts, user_id, client_id, endpoint, status_code, duration_ms, request_meta, error)
           values (?, ?, ?, ?, ?, ?, cast(? as json), ?)`,
          [new Date(), authed?.userId ?? null, clientId, 'suggest_mapping', 429, Date.now() - startedAt, toJson({ fileCount, headerCounts }), 'Quota exceeded'],
        ).catch(() => {});
        res.status(429).json({ error: 'Quota exceeded' });
        return;
      }
    }

    const mappingResult = await generateMapping({ files });
    const durationMs = Date.now() - startedAt;
    await pool.query(
      `insert into telemetry_events (ts, type, client_id, props) values (?, ?, ?, cast(? as json))`,
      [
        new Date(),
        'suggest_mapping_success',
        clientId,
        toJson({ durationMs, unifiedSchemaLen: Array.isArray((mappingResult as any)?.unifiedSchema) ? (mappingResult as any).unifiedSchema.length : undefined }),
      ],
    );
    await pool.query(
      `insert into api_calls (ts, user_id, client_id, endpoint, status_code, duration_ms, request_meta, response_meta)
       values (?, ?, ?, ?, ?, ?, cast(? as json), cast(? as json))`,
      [
        new Date(),
        authed?.userId ?? null,
        clientId,
        'suggest_mapping',
        200,
        durationMs,
        toJson({ fileCount, headerCounts }),
        toJson({ unifiedSchemaLen: Array.isArray((mappingResult as any)?.unifiedSchema) ? (mappingResult as any).unifiedSchema.length : undefined }),
      ],
    ).catch(() => {});
    res.json(mappingResult);
  } catch (error) {
    console.error('API Error:', error);
    const durationMs = Date.now() - startedAt;
    const clientIdHeader = String(req.header('x-client-id') || '').trim();
    const clientId = clientIdHeader ? clientIdHeader.slice(0, 80) : null;
    await pool.query(
      `insert into telemetry_events (ts, type, client_id, props) values (?, ?, ?, cast(? as json))`,
      [new Date(), 'suggest_mapping_failure', clientId, toJson({ durationMs })],
    ).catch(() => {});
    await pool.query(
      `insert into api_calls (ts, user_id, client_id, endpoint, status_code, duration_ms, request_meta, error)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
      [new Date(), authed?.userId ?? null, clientId, 'suggest_mapping', 500, durationMs, null, 'Failed to generate mapping'],
    ).catch(() => {});
    res.status(500).json({ error: 'Failed to generate mapping.' });
  }
});

suggestMappingRouter.post('/ai-clean', authRequired, async (req: AuthedRequest, res: Response) => {
  const startedAt = Date.now();
  const authed = req.auth!;

  try {
    const { prompt, mappingResult, sampleData } = req.body as AiCleanRequest;
    const clientIdHeader = String(req.header('x-client-id') || '').trim();
    const clientId = clientIdHeader ? clientIdHeader.slice(0, 80) : null;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const result = await generateAiClean({ prompt, mappingResult, sampleData });
    const durationMs = Date.now() - startedAt;

    // 记录调用
    await pool.query(
      `insert into api_calls (ts, user_id, client_id, endpoint, status_code, duration_ms, request_meta)
       values (?, ?, ?, ?, ?, ?, cast(? as json))`,
      [new Date(), authed?.userId ?? null, clientId, 'ai_clean', 200, durationMs, toJson({ promptLen: prompt.length })],
    ).catch(() => {});

    res.json(result);
  } catch (error: any) {
    console.error('AI Clean error:', error);
    res.status(500).json({ error: error.message || 'AI cleaning failed' });
  }
});
