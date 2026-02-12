import { pool, parseJson, toJson } from './db';

export type ConfigKey =
  | 'free_analyze_daily_limit'
  | 'free_export_daily_limit'
  | 'user_analyze_daily_limit'
  | 'user_export_daily_limit';

export const defaultConfig: Record<ConfigKey, number> = {
  free_analyze_daily_limit: 20,
  free_export_daily_limit: 0,
  user_analyze_daily_limit: 200,
  user_export_daily_limit: 0,
};

export const getConfigNumber = async (key: ConfigKey): Promise<number> => {
  const res = await pool.query(`select value from app_config where \`key\` = ?`, [key]);
  const raw = res.rows?.[0]?.value as unknown;
  const parsed = parseJson(raw);
  const v = parsed ?? raw;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  if (v && typeof v === 'object' && 'value' in (v as any)) {
    const inner = (v as any).value;
    if (typeof inner === 'number' && Number.isFinite(inner)) return inner;
    const n = Number(inner);
    if (Number.isFinite(n)) return n;
  }
  return defaultConfig[key];
};

export const setConfigNumber = async (key: ConfigKey, value: number) => {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) throw new Error('Invalid value');
  await pool.query(
    `insert into app_config (\`key\`, value, updated_at)
     values (?, cast(? as json), ?)
     on duplicate key update value = values(value), updated_at = values(updated_at)`,
    [key, toJson(v), new Date()],
  );
};

export const getAllConfig = async () => {
  const res = await pool.query(`select \`key\`, value, updated_at from app_config`);
  const map: Record<string, unknown> = {};
  for (const row of res.rows as Array<{ key: string; value: unknown }>) {
    map[row.key] = parseJson(row.value) ?? row.value;
  }
  return {
    ...defaultConfig,
    ...map,
  };
};
