import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export type AccessTokenPayload = {
  userId: string;
  email: string;
};

export const hashPassword = async (password: string) => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);

export const signAccessToken = (payload: AccessTokenPayload, secret: string, expiresInSeconds: number) => {
  return jwt.sign(payload, secret, { expiresIn: expiresInSeconds });
};

export const verifyAccessToken = (token: string, secret: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, secret) as unknown;
  if (!decoded || typeof decoded !== 'object') throw new Error('Invalid token');
  const obj = decoded as Record<string, unknown>;
  if (typeof obj.userId !== 'string' || typeof obj.email !== 'string') throw new Error('Invalid token payload');
  return { userId: obj.userId, email: obj.email };
};

