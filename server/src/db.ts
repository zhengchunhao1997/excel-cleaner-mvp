import mysql from 'mysql2/promise';
import { hashPassword } from './auth';

type QueryResult = { rows: any[] };

const parseMySqlUrl = (url: string) => {
  const u = new URL(url);
  if (!['mysql:', 'mariadb:'].includes(u.protocol)) {
    throw new Error('DATABASE_URL must start with mysql://');
  }
  const host = u.hostname || '127.0.0.1';
  const port = u.port ? Number(u.port) : 3306;
  const user = decodeURIComponent(u.username || '');
  const password = decodeURIComponent(u.password || '');
  const database = u.pathname.replace(/^\//, '');
  if (!user) throw new Error('DATABASE_URL missing username');
  if (!database) throw new Error('DATABASE_URL missing database');
  return { host, port, user, password, database };
};

const buildConfig = () => {
  const url = process.env.DATABASE_URL;
  if (url) return parseMySqlUrl(url);
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
  const user = process.env.DB_USER || '';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || '';
  if (!user || !database) throw new Error('Missing database config (DATABASE_URL or DB_USER/DB_NAME)');
  return { host, port, user, password, database };
};

const mysqlPool = mysql.createPool({
  ...buildConfig(),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  charset: 'utf8mb4',
  timezone: 'Z',
});

export const pool = {
  query: async (sql: string, params?: any[]): Promise<QueryResult> => {
    // 使用 query 替代 execute 以避免 mysql2 在某些版本或特定参数下（如 LIMIT ?）的预处理语句错误
    const [rows] = await mysqlPool.query(sql, params || []);
    return { rows: Array.isArray(rows) ? (rows as any[]) : [] };
  },
};

export const toJson = (v: unknown) => JSON.stringify(v ?? null);

export const parseJson = <T = any>(raw: unknown): T | null => {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const initDb = async () => {
  await pool.query(`
    create table if not exists telemetry_events (
      id bigint not null auto_increment primary key,
      ts datetime(3) not null,
      type varchar(120) not null,
      client_id varchar(80) null,
      props json null,
      key idx_telemetry_events_ts (ts),
      key idx_telemetry_events_type (type),
      key idx_telemetry_events_client_id (client_id)
    ) engine=InnoDB default charset=utf8mb4;
  `);

  await pool.query(`
    create table if not exists email_codes (
      id bigint not null auto_increment primary key,
      email varchar(255) not null,
      code varchar(16) not null,
      expires_at datetime(3) not null,
      created_at datetime(3) not null,
      key idx_email_codes_email_created (email, created_at)
    ) engine=InnoDB default charset=utf8mb4;
  `);

  await pool.query(`
    create table if not exists clients (
      client_id varchar(80) not null primary key,
      first_seen datetime(3) not null,
      last_seen datetime(3) not null,
      key idx_clients_last_seen (last_seen)
    ) engine=InnoDB default charset=utf8mb4;
  `);

  await pool.query(`
    create table if not exists feedback (
      id bigint not null auto_increment primary key,
      ts datetime(3) not null,
      client_id varchar(80) null,
      rating tinyint not null,
      comment text not null,
      email varchar(255) null,
      key idx_feedback_ts (ts),
      key idx_feedback_rating (rating)
    ) engine=InnoDB default charset=utf8mb4;
  `);

  await pool.query(`
    create table if not exists app_config (
      \`key\` varchar(120) not null primary key,
      value json not null,
      updated_at datetime(3) not null
    ) engine=InnoDB default charset=utf8mb4;
  `);

  await pool.query(`
    create table if not exists users (
      id varchar(64) not null primary key,
      email varchar(255) not null unique,
      password_hash varchar(255) not null,
      plan varchar(32) not null default 'free',
      daily_analyze_limit int not null default 0,
      daily_export_limit int not null default 0,
      created_at datetime(3) not null,
      last_login_at datetime(3) null,
      key idx_users_created_at (created_at)
    ) engine=InnoDB default charset=utf8mb4;
  `);

  await pool.query(`
    create table if not exists user_clients (
      user_id varchar(64) not null,
      client_id varchar(80) not null,
      created_at datetime(3) not null,
      primary key (user_id, client_id),
      key idx_user_clients_client_id (client_id),
      constraint fk_user_clients_user_id foreign key (user_id) references users(id) on delete cascade,
      constraint fk_user_clients_client_id foreign key (client_id) references clients(client_id) on delete cascade
    ) engine=InnoDB default charset=utf8mb4;
  `);

  await pool.query(`
    create table if not exists api_calls (
      id bigint not null auto_increment primary key,
      ts datetime(3) not null,
      user_id varchar(64) null,
      client_id varchar(80) null,
      endpoint varchar(120) not null,
      status_code int not null,
      duration_ms int null,
      request_meta json null,
      response_meta json null,
      error text null,
      key idx_api_calls_ts (ts),
      key idx_api_calls_user_ts (user_id, ts),
      key idx_api_calls_client_ts (client_id, ts),
      constraint fk_api_calls_user_id foreign key (user_id) references users(id) on delete set null
    ) engine=InnoDB default charset=utf8mb4;
  `);

  await pool.query(
    `insert into app_config (\`key\`, value, updated_at)
     values
       (?, cast(? as json), ?),
       (?, cast(? as json), ?),
       (?, cast(? as json), ?),
       (?, cast(? as json), ?)
     on duplicate key update \`key\`=\`key\``,
    [
      'free_analyze_daily_limit',
      toJson(20),
      new Date(),
      'free_export_daily_limit',
      toJson(0),
      new Date(),
      'user_analyze_daily_limit',
      toJson(200),
      new Date(),
      'user_export_daily_limit',
      toJson(0),
      new Date(),
    ],
  );

  // Seed default admin account
  const adminEmail = '13252782130@163.com';
  const adminPassword = 'zch199783.';
  const { rows: adminExists } = await pool.query('select * from users where email = ?', [adminEmail]);
  
  if (adminExists.length === 0) {
    const adminId = 'admin_' + Math.random().toString(36).substring(2, 10);
    const passwordHash = await hashPassword(adminPassword);
    await pool.query(
      `insert into users (id, email, password_hash, plan, daily_analyze_limit, daily_export_limit, created_at)
       values (?, ?, ?, 'admin', 999999, 999999, ?)`,
      [adminId, adminEmail, passwordHash, new Date()],
    );
    console.log(`Admin account seeded: ${adminEmail}`);
  } else {
    // 确保管理员密码和权限是最新的
    const passwordHash = await hashPassword(adminPassword);
    await pool.query(
      `update users set password_hash = ?, plan = 'admin', daily_analyze_limit = 999999, daily_export_limit = 999999 where email = ?`,
      [passwordHash, adminEmail]
    );
    console.log(`Admin account updated: ${adminEmail}`);
  }
};
