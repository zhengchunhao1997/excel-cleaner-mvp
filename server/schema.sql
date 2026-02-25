-- excelMerge Schema Update
-- Created at: 2026-02-09

CREATE TABLE IF NOT EXISTS telemetry_events (
  id bigint not null auto_increment primary key,
  ts datetime(3) not null,
  type varchar(120) not null,
  client_id varchar(80) null,
  props json null,
  key idx_telemetry_events_ts (ts),
  key idx_telemetry_events_type (type),
  key idx_telemetry_events_client_id (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_codes (
  id bigint not null auto_increment primary key,
  email varchar(255) not null,
  code varchar(16) not null,
  expires_at datetime(3) not null,
  created_at datetime(3) not null,
  key idx_email_codes_email_created (email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clients (
  client_id varchar(80) not null primary key,
  first_seen datetime(3) not null,
  last_seen datetime(3) not null,
  key idx_clients_last_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feedback (
  id bigint not null auto_increment primary key,
  ts datetime(3) not null,
  client_id varchar(80) null,
  rating tinyint not null,
  comment text not null,
  email varchar(255) null,
  key idx_feedback_ts (ts),
  key idx_feedback_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_config (
  `key` varchar(120) not null primary key,
  value json not null,
  updated_at datetime(3) not null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id varchar(64) not null primary key,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  plan varchar(32) not null default 'free',
  daily_analyze_limit int not null default 0,
  daily_export_limit int not null default 0,
  created_at datetime(3) not null,
  last_login_at datetime(3) null,
  key idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_clients (
  user_id varchar(64) not null,
  client_id varchar(80) not null,
  created_at datetime(3) not null,
  primary key (user_id, client_id),
  key idx_user_clients_client_id (client_id),
  constraint fk_user_clients_user_id foreign key (user_id) references users(id) on delete cascade,
  constraint fk_user_clients_client_id foreign key (client_id) references clients(client_id) on delete cascade
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS api_calls (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
