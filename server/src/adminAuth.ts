import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './auth';
import { pool } from './db';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    const adminToken = process.env.ADMIN_TOKEN;
    
    // 1. 检查固定的 ADMIN_TOKEN (x-admin-token 或 token 参数)
    const headerToken = String(req.header('x-admin-token') || '').trim();
    const queryToken = String(req.query.token || '').trim();
    const provided = headerToken || queryToken;

    console.log(`[AdminAuth] Checking access. provided: ${provided ? 'YES' : 'NO'}, adminToken set: ${adminToken ? 'YES' : 'NO'}`);

    if (adminToken && provided === adminToken) {
      console.log('[AdminAuth] Static token match.');
      (req as any).adminUser = { email: 'admin@system', plan: 'admin' };
      next();
      return;
    }

    // 2. 检查 JWT Token
    const authHeader = String(req.header('authorization') || '');
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    // 同时也支持从 query 中的 token 或 jwt 参数获取
    const jwtToken = (bearerMatch && bearerMatch[1]) || queryToken || String(req.query.jwt || '').trim();

    if (jwtToken && jwtToken !== adminToken) {
      try {
        const secret = process.env.JWT_SECRET || 'dev_secret';
        console.log('[AdminAuth] Verifying JWT token...');
        const payload = verifyAccessToken(jwtToken, secret);
        console.log('[AdminAuth] JWT verified, userId:', payload.userId);
        
        const found = await pool.query(`select id, email, plan from users where id = ?`, [payload.userId]);
        const user = found.rows?.[0];
        
        if (user && user.plan === 'admin') {
          console.log('[AdminAuth] Admin user verified:', user.email);
          (req as any).adminUser = user;
          next();
          return;
        } else {
          console.warn(`[AdminAuth] Admin access denied for user: ${user?.email || 'unknown'}, plan: ${user?.plan || 'none'}`);
        }
      } catch (err: any) {
        console.error('[AdminAuth] JWT Admin Auth Error:', err.message);
      }
    }

    // 如果没有任何 token 且环境允许，则放行 (仅用于开发调试)
    if (!adminToken) {
      console.log('[AdminAuth] No ADMIN_TOKEN set in env, allowing access for development.');
      (req as any).adminUser = { email: 'dev@system', plan: 'admin' };
      next();
      return;
    }

    console.warn('[AdminAuth] Unauthorized access attempt.');
    res.status(401).json({ error: 'Unauthorized' });
  })().catch((err) => {
    console.error('[AdminAuth] Middleware Error:', err);
    res.status(401).json({ error: 'Unauthorized' });
  });
};
