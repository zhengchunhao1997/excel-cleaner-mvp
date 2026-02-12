import assert from 'node:assert/strict';
import { getEnvPath } from '../src/env';

const run = async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevDotenvPath = process.env.DOTENV_CONFIG_PATH;

  try {
    delete process.env.DOTENV_CONFIG_PATH;
    process.env.NODE_ENV = 'production';
    assert.equal(getEnvPath(), '.env.production');

    process.env.DOTENV_CONFIG_PATH = '/tmp/custom.env';
    assert.equal(getEnvPath(), '/tmp/custom.env');

    delete process.env.DOTENV_CONFIG_PATH;
    process.env.NODE_ENV = 'development';
    assert.equal(getEnvPath(), '.env');
  } finally {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;

    if (prevDotenvPath === undefined) delete process.env.DOTENV_CONFIG_PATH;
    else process.env.DOTENV_CONFIG_PATH = prevDotenvPath;
  }
};

run()
  .then(() => process.stdout.write('env.test.ts ok\n'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

