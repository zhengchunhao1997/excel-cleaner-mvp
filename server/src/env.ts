import dotenv from 'dotenv';

export const getEnvPath = () => {
  if (process.env.DOTENV_CONFIG_PATH) return process.env.DOTENV_CONFIG_PATH;
  if (process.env.NODE_ENV === 'production') return '.env.production';
  return '.env';
};

export const loadEnv = () => {
  dotenv.config({ path: getEnvPath() });
};
