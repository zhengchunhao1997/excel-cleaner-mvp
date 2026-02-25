import { Router, Request, Response } from 'express';
import { pool } from './db';
import { hashPassword, signAccessToken, verifyPassword } from './auth';
import { authRequired, AuthedRequest } from './authMiddleware';
import { getConfigNumber } from './config';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

export const authRouter = Router();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

const createTransport = () => {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 0) || 587;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  if (host && user && pass) {
    console.log(`Creating SMTP transport for ${user} via ${host}:${port}`);
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  }
  console.warn('SMTP configuration missing:', { host: !!host, user: !!user, pass: !!pass });
  return null;
};

authRouter.post('/auth/send-code', (req: Request, res: Response) => {
  (async () => {
    const { email } = (req.body || {}) as { email?: string };
    console.log('Request to send code to:', email);
    const e = typeof email === 'string' ? normalizeEmail(email) : '';
    if (!e || !e.includes('@')) {
      console.warn('Invalid email provided:', email);
      res.status(400).json({ error: 'Invalid email' });
      return;
    }
    const code = generateCode();
    const now = new Date();
    const exp = new Date(now.getTime() + 10 * 60 * 1000);
    await pool.query(
      `insert into email_codes (email, code, expires_at, created_at)
       values (?, ?, ?, ?)`,
      [e, code, exp, now],
    );
    const transporter = createTransport();
    const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
    const from = `"excelMerge" <${fromAddr}>`;
    if (transporter) {
      console.log(`Sending mail from ${from} to ${e}...`);
      try {
        const subject = `[excelMerge] 您的验证码 / Your Verification Code: ${code}`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">excelMerge</h2>
            <p style="font-size: 16px; color: #333;">您好！感谢您注册使用 <strong>excelMerge</strong>。</p>
            <p style="font-size: 16px; color: #333;">您的验证码为：</p>
            <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2563eb; margin: 20px 0; border-radius: 5px;">
              ${code}
            </div>
            <p style="font-size: 14px; color: #666;">验证码有效期为 10 分钟。如果不是您本人操作，请忽略此邮件。</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            
            <p style="font-size: 16px; color: #333;">Hello! Thank you for registering with <strong>excelMerge</strong>.</p>
            <p style="font-size: 16px; color: #333;">Your verification code is:</p>
            <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2563eb; margin: 20px 0; border-radius: 5px;">
              ${code}
            </div>
            <p style="font-size: 14px; color: #666;">The code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
              © ${new Date().getFullYear()} excelMerge. All rights reserved.
            </p>
          </div>
        `;
        
        await transporter.sendMail({ 
          from, 
          to: e, 
          subject, 
          text: `您的验证码是 ${code}。Your verification code is ${code}.`,
          html
        });
        console.log('Mail sent successfully to:', e);
        res.json({ ok: true });
      } catch (mailErr) {
        console.error('Nodemailer sendMail failed:', mailErr);
        throw mailErr;
      }
      return;
    }
    console.log('No transporter available. Verification code for', e, 'is', code);
    res.json({ ok: true, debugCode: code });
  })().catch((err) => {
    console.error('Failed to send code:', err);
    res.status(500).json({ error: 'Failed to send code' });
  });
});

authRouter.post('/auth/login-code', (req: Request, res: Response) => {
  (async () => {
    const { email, code } = (req.body || {}) as { email?: string; code?: string };
    const e = typeof email === 'string' ? normalizeEmail(email) : '';
    const c = typeof code === 'string' ? code.trim() : '';
    if (!e || !c) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const found = await pool.query(
      `select code, expires_at as "expiresAt" from email_codes
       where email = ? order by created_at desc limit 1`,
      [e],
    );
    const row = found.rows[0] as any;
    if (!row) {
      res.status(400).json({ error: 'Code not found' });
      return;
    }
    if (String(row.code) !== c) {
      res.status(400).json({ error: 'Invalid code' });
      return;
    }
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: 'Code expired' });
      return;
    }
    const userRes = await pool.query(`select id, email, plan, daily_analyze_limit as dailyAnalyzeLimit, daily_export_limit as dailyExportLimit from users where email = ?`, [e]);
    let user = userRes.rows[0] as any;
    if (!user) {
      const userId = crypto.randomUUID();
      const dailyAnalyzeLimit = 20;
      const dailyExportLimit = 0;
      await pool.query(
        `insert into users (id, email, password_hash, plan, daily_analyze_limit, daily_export_limit, created_at)
         values (?, ?, ?, ?, ?, ?, ?)`,
        [userId, e, '', 'free', dailyAnalyzeLimit, dailyExportLimit, new Date()],
      );
      user = { id: userId, email: e, plan: 'free', dailyAnalyzeLimit, dailyExportLimit };
  } else {
    if (String(user.plan || '') !== 'admin') {
      await pool.query(`update users set daily_analyze_limit = ? where id = ?`, [20, user.id]).catch(() => {});
      user.dailyAnalyzeLimit = 20;
    }
  }
    const secret = process.env.JWT_SECRET || 'dev_secret';
    const token = signAccessToken({ userId: user.id, email: user.email }, secret, 60 * 60 * 24 * 30);
    res.json({ token, user });
  })().catch((err) => {
    console.error('Login code error:', err);
    res.status(500).json({ error: 'Failed to login' });
  });
});

authRouter.post('/auth/register', (req: Request, res: Response) => {
  (async () => {
    const { email, password } = (req.body || {}) as { email?: string; password?: string };
    const e = typeof email === 'string' ? normalizeEmail(email) : '';
    const p = typeof password === 'string' ? password : '';
    if (!e || !e.includes('@')) {
      res.status(400).json({ error: 'Invalid email' });
      return;
    }
    if (p.length < 8) {
      res.status(400).json({ error: 'Password too short' });
      return;
    }

    const passwordHash = await hashPassword(p);
    const nowIso = new Date().toISOString();
    const dailyAnalyzeLimit = await getConfigNumber('user_analyze_daily_limit');
    const dailyExportLimit = await getConfigNumber('user_export_daily_limit');
    const userId = crypto.randomUUID();

    await pool.query(
      `insert into users (id, email, password_hash, plan, daily_analyze_limit, daily_export_limit, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [userId, e, passwordHash, 'free', dailyAnalyzeLimit, dailyExportLimit, new Date(nowIso)],
    );

    const user = {
      id: userId,
      email: e,
      plan: 'free',
      dailyAnalyzeLimit,
      dailyExportLimit,
      createdAt: nowIso,
    };
    const secret = process.env.JWT_SECRET || 'dev_secret';
    const token = signAccessToken({ userId: user.id, email: user.email }, secret, 60 * 60 * 24 * 30);
    res.json({ token, user });
  })().catch((err: any) => {
    const code = String(err?.code || '');
    const msg = String(err?.message || '');
    if (code === 'ER_DUP_ENTRY' || msg.toLowerCase().includes('duplicate entry')) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to register' });
  });
});

authRouter.post('/auth/login', (req: Request, res: Response) => {
  (async () => {
    const { email, password } = (req.body || {}) as { email?: string; password?: string };
    const e = typeof email === 'string' ? normalizeEmail(email) : '';
    const p = typeof password === 'string' ? password : '';
    if (!e || !p) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    const found = await pool.query(
      `select id, email, password_hash as passwordHash, plan,
              daily_analyze_limit as dailyAnalyzeLimit, daily_export_limit as dailyExportLimit,
              created_at as createdAt, last_login_at as lastLoginAt
       from users where email = ?`,
      [e],
    );
    const user = found.rows[0] as any;
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const ok = await verifyPassword(p, String(user.passwordHash));
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    await pool.query(`update users set last_login_at = ? where id = ?`, [new Date(), user.id]);

    const secret = process.env.JWT_SECRET || 'dev_secret';
    const token = signAccessToken({ userId: user.id, email: user.email }, secret, 60 * 60 * 24 * 30);
    delete user.passwordHash;
    res.json({ token, user });
  })().catch((err) => {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  });
});

authRouter.get('/auth/me', authRequired, (req: AuthedRequest, res: Response) => {
  (async () => {
    const userId = req.auth!.userId;
    const found = await pool.query(
      `select id, email, plan,
              daily_analyze_limit as dailyAnalyzeLimit, daily_export_limit as dailyExportLimit,
              created_at as createdAt, last_login_at as lastLoginAt
       from users where id = ?`,
      [userId],
    );
    const user = found.rows[0] as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Also fetch usage
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const usedRes = await pool.query(
      `select count(*) as n
       from api_calls
       where endpoint = 'suggest_mapping' and status_code = 200 and user_id = ? and ts >= ?`,
      [userId, dayStart],
    );
    const used = Number((usedRes.rows?.[0] as any)?.n ?? 0);
    
    res.json({ user, usage: { analyzeUsed: used } });
  })().catch(() => res.status(500).json({ error: 'Failed to fetch user' }));
});

authRouter.post('/auth/bind-client', authRequired, (req: AuthedRequest, res: Response) => {
  (async () => {
    const clientId = String((req.body || {}).clientId || '').trim().slice(0, 80);
    if (!clientId) {
      res.status(400).json({ error: 'clientId required' });
      return;
    }
    const nowIso = new Date().toISOString();
    await pool.query(
      `insert into clients (client_id, first_seen, last_seen)
       values (?, ?, ?)
       on duplicate key update last_seen = values(last_seen)`,
      [clientId, new Date(nowIso), new Date(nowIso)],
    );
    await pool.query(
      `insert into user_clients (user_id, client_id, created_at)
       values (?, ?, ?)
       on duplicate key update created_at = created_at`,
      [req.auth!.userId, clientId, new Date(nowIso)],
    );
    res.json({ ok: true });
  })().catch(() => res.status(500).json({ error: 'Failed to bind' }));
});
