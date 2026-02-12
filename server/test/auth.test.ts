import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, signAccessToken, verifyAccessToken } from '../src/auth';

const run = async () => {
  const hash = await hashPassword('passw0rd!');
  assert.equal(typeof hash, 'string');
  assert.equal(await verifyPassword('passw0rd!', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);

  const token = signAccessToken({ userId: 'u1', email: 'a@example.com' }, 'secret', 60);
  const payload = verifyAccessToken(token, 'secret');
  assert.equal(payload.userId, 'u1');
  assert.equal(payload.email, 'a@example.com');
};

run()
  .then(() => process.stdout.write('auth.test.ts ok\n'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

