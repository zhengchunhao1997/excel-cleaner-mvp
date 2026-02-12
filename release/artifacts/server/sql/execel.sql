/*
 Navicat Premium Dump SQL

 Source Server         : 本地
 Source Server Type    : PostgreSQL
 Source Server Version : 140020 (140020)
 Source Host           : localhost:5432
 Source Catalog        : execel
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 140020 (140020)
 File Encoding         : 65001

 Date: 09/02/2026 12:01:20
*/


-- ----------------------------
-- Sequence structure for api_calls_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."api_calls_id_seq";
CREATE SEQUENCE "public"."api_calls_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."api_calls_id_seq" OWNER TO "Zhuanz";

-- ----------------------------
-- Sequence structure for feedback_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."feedback_id_seq";
CREATE SEQUENCE "public"."feedback_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."feedback_id_seq" OWNER TO "Zhuanz";

-- ----------------------------
-- Sequence structure for telemetry_events_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."telemetry_events_id_seq";
CREATE SEQUENCE "public"."telemetry_events_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."telemetry_events_id_seq" OWNER TO "Zhuanz";

-- ----------------------------
-- Table structure for api_calls
-- ----------------------------
DROP TABLE IF EXISTS "public"."api_calls";
CREATE TABLE "public"."api_calls" (
  "id" int8 NOT NULL DEFAULT nextval('api_calls_id_seq'::regclass),
  "ts" timestamptz(6) NOT NULL,
  "user_id" text COLLATE "pg_catalog"."default",
  "client_id" text COLLATE "pg_catalog"."default",
  "endpoint" text COLLATE "pg_catalog"."default" NOT NULL,
  "status_code" int4 NOT NULL,
  "duration_ms" int4,
  "request_meta" jsonb,
  "response_meta" jsonb,
  "error" text COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."api_calls" OWNER TO "Zhuanz";

-- ----------------------------
-- Records of api_calls
-- ----------------------------
BEGIN;
INSERT INTO "public"."api_calls" ("id", "ts", "user_id", "client_id", "endpoint", "status_code", "duration_ms", "request_meta", "response_meta", "error") VALUES (1, '2026-02-06 12:19:10.852+08', NULL, '3978f3c5-053a-4704-b84a-ee0126746ef1', 'suggest_mapping', 200, 7844, '{"fileCount": 2, "headerCounts": [6, 7]}', '{"unifiedSchemaLen": 8}', NULL);
INSERT INTO "public"."api_calls" ("id", "ts", "user_id", "client_id", "endpoint", "status_code", "duration_ms", "request_meta", "response_meta", "error") VALUES (2, '2026-02-06 12:19:56.637+08', NULL, '3978f3c5-053a-4704-b84a-ee0126746ef1', 'suggest_mapping', 200, 9100, '{"fileCount": 2, "headerCounts": [6, 7]}', '{"unifiedSchemaLen": 11}', NULL);
COMMIT;

-- ----------------------------
-- Table structure for app_config
-- ----------------------------
DROP TABLE IF EXISTS "public"."app_config";
CREATE TABLE "public"."app_config" (
  "key" text COLLATE "pg_catalog"."default" NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamptz(6) NOT NULL
)
;
ALTER TABLE "public"."app_config" OWNER TO "Zhuanz";

-- ----------------------------
-- Records of app_config
-- ----------------------------
BEGIN;
INSERT INTO "public"."app_config" ("key", "value", "updated_at") VALUES ('free_analyze_daily_limit', '20', '2026-02-06 12:03:40.518216+08');
INSERT INTO "public"."app_config" ("key", "value", "updated_at") VALUES ('free_export_daily_limit', '0', '2026-02-06 12:03:40.518216+08');
INSERT INTO "public"."app_config" ("key", "value", "updated_at") VALUES ('user_analyze_daily_limit', '200', '2026-02-06 12:03:40.518216+08');
INSERT INTO "public"."app_config" ("key", "value", "updated_at") VALUES ('user_export_daily_limit', '0', '2026-02-06 12:03:40.518216+08');
COMMIT;

-- ----------------------------
-- Table structure for clients
-- ----------------------------
DROP TABLE IF EXISTS "public"."clients";
CREATE TABLE "public"."clients" (
  "client_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "first_seen" timestamptz(6) NOT NULL,
  "last_seen" timestamptz(6) NOT NULL
)
;
ALTER TABLE "public"."clients" OWNER TO "Zhuanz";

-- ----------------------------
-- Records of clients
-- ----------------------------
BEGIN;
INSERT INTO "public"."clients" ("client_id", "first_seen", "last_seen") VALUES ('3978f3c5-053a-4704-b84a-ee0126746ef1', '2026-02-06 12:19:01.543+08', '2026-02-06 12:19:56.641+08');
COMMIT;

-- ----------------------------
-- Table structure for feedback
-- ----------------------------
DROP TABLE IF EXISTS "public"."feedback";
CREATE TABLE "public"."feedback" (
  "id" int8 NOT NULL DEFAULT nextval('feedback_id_seq'::regclass),
  "ts" timestamptz(6) NOT NULL,
  "client_id" text COLLATE "pg_catalog"."default",
  "rating" int2 NOT NULL,
  "comment" text COLLATE "pg_catalog"."default" NOT NULL,
  "email" text COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."feedback" OWNER TO "Zhuanz";

-- ----------------------------
-- Records of feedback
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for telemetry_events
-- ----------------------------
DROP TABLE IF EXISTS "public"."telemetry_events";
CREATE TABLE "public"."telemetry_events" (
  "id" int8 NOT NULL DEFAULT nextval('telemetry_events_id_seq'::regclass),
  "ts" timestamptz(6) NOT NULL,
  "type" text COLLATE "pg_catalog"."default" NOT NULL,
  "client_id" text COLLATE "pg_catalog"."default",
  "props" jsonb
)
;
ALTER TABLE "public"."telemetry_events" OWNER TO "Zhuanz";

-- ----------------------------
-- Records of telemetry_events
-- ----------------------------
BEGIN;
INSERT INTO "public"."telemetry_events" ("id", "ts", "type", "client_id", "props") VALUES (1, '2026-02-06 12:19:01.543+08', 'upload', '3978f3c5-053a-4704-b84a-ee0126746ef1', '{"fileCount": 2}');
INSERT INTO "public"."telemetry_events" ("id", "ts", "type", "client_id", "props") VALUES (2, '2026-02-06 12:19:03.003+08', 'analyze_start', '3978f3c5-053a-4704-b84a-ee0126746ef1', '{"fileCount": 2}');
INSERT INTO "public"."telemetry_events" ("id", "ts", "type", "client_id", "props") VALUES (3, '2026-02-06 12:19:03.008+08', 'suggest_mapping_start', '3978f3c5-053a-4704-b84a-ee0126746ef1', '{"fileCount": 2, "headerCounts": [6, 7]}');
INSERT INTO "public"."telemetry_events" ("id", "ts", "type", "client_id", "props") VALUES (4, '2026-02-06 12:19:10.851+08', 'suggest_mapping_success', '3978f3c5-053a-4704-b84a-ee0126746ef1', '{"durationMs": 7844, "unifiedSchemaLen": 8}');
INSERT INTO "public"."telemetry_events" ("id", "ts", "type", "client_id", "props") VALUES (5, '2026-02-06 12:19:10.86+08', 'analyze_success', '3978f3c5-053a-4704-b84a-ee0126746ef1', '{"unifiedFields": 8}');
INSERT INTO "public"."telemetry_events" ("id", "ts", "type", "client_id", "props") VALUES (6, '2026-02-06 12:19:47.536+08', 'suggest_mapping_start', '3978f3c5-053a-4704-b84a-ee0126746ef1', '{"fileCount": 2, "headerCounts": [6, 7]}');
INSERT INTO "public"."telemetry_events" ("id", "ts", "type", "client_id", "props") VALUES (7, '2026-02-06 12:19:47.525+08', 'analyze_start', '3978f3c5-053a-4704-b84a-ee0126746ef1', '{"fileCount": 2}');
INSERT INTO "public"."telemetry_events" ("id", "ts", "type", "client_id", "props") VALUES (8, '2026-02-06 12:19:56.636+08', 'suggest_mapping_success', '3978f3c5-053a-4704-b84a-ee0126746ef1', '{"durationMs": 9100, "unifiedSchemaLen": 11}');
INSERT INTO "public"."telemetry_events" ("id", "ts", "type", "client_id", "props") VALUES (9, '2026-02-06 12:19:56.641+08', 'analyze_success', '3978f3c5-053a-4704-b84a-ee0126746ef1', '{"unifiedFields": 11}');
COMMIT;

-- ----------------------------
-- Table structure for user_clients
-- ----------------------------
DROP TABLE IF EXISTS "public"."user_clients";
CREATE TABLE "public"."user_clients" (
  "user_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "client_id" text COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL
)
;
ALTER TABLE "public"."user_clients" OWNER TO "Zhuanz";

-- ----------------------------
-- Records of user_clients
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "public"."users";
CREATE TABLE "public"."users" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "email" text COLLATE "pg_catalog"."default" NOT NULL,
  "password_hash" text COLLATE "pg_catalog"."default" NOT NULL,
  "plan" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'free'::text,
  "daily_analyze_limit" int4 NOT NULL DEFAULT 0,
  "daily_export_limit" int4 NOT NULL DEFAULT 0,
  "created_at" timestamptz(6) NOT NULL,
  "last_login_at" timestamptz(6)
)
;
ALTER TABLE "public"."users" OWNER TO "Zhuanz";

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."api_calls_id_seq"
OWNED BY "public"."api_calls"."id";
SELECT setval('"public"."api_calls_id_seq"', 2, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."feedback_id_seq"
OWNED BY "public"."feedback"."id";
SELECT setval('"public"."feedback_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."telemetry_events_id_seq"
OWNED BY "public"."telemetry_events"."id";
SELECT setval('"public"."telemetry_events_id_seq"', 9, true);

-- ----------------------------
-- Indexes structure for table api_calls
-- ----------------------------
CREATE INDEX "idx_api_calls_client_ts" ON "public"."api_calls" USING btree (
  "client_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "ts" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_api_calls_ts" ON "public"."api_calls" USING btree (
  "ts" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_api_calls_user_ts" ON "public"."api_calls" USING btree (
  "user_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "ts" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table api_calls
-- ----------------------------
ALTER TABLE "public"."api_calls" ADD CONSTRAINT "api_calls_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table app_config
-- ----------------------------
ALTER TABLE "public"."app_config" ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");

-- ----------------------------
-- Indexes structure for table clients
-- ----------------------------
CREATE INDEX "idx_clients_last_seen" ON "public"."clients" USING btree (
  "last_seen" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table clients
-- ----------------------------
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("client_id");

-- ----------------------------
-- Indexes structure for table feedback
-- ----------------------------
CREATE INDEX "idx_feedback_rating" ON "public"."feedback" USING btree (
  "rating" "pg_catalog"."int2_ops" ASC NULLS LAST
);
CREATE INDEX "idx_feedback_ts" ON "public"."feedback" USING btree (
  "ts" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);

-- ----------------------------
-- Checks structure for table feedback
-- ----------------------------
ALTER TABLE "public"."feedback" ADD CONSTRAINT "feedback_rating_check" CHECK (rating >= 1 AND rating <= 5);

-- ----------------------------
-- Primary Key structure for table feedback
-- ----------------------------
ALTER TABLE "public"."feedback" ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table telemetry_events
-- ----------------------------
CREATE INDEX "idx_telemetry_events_client_id" ON "public"."telemetry_events" USING btree (
  "client_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_telemetry_events_ts" ON "public"."telemetry_events" USING btree (
  "ts" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_telemetry_events_type" ON "public"."telemetry_events" USING btree (
  "type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table telemetry_events
-- ----------------------------
ALTER TABLE "public"."telemetry_events" ADD CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table user_clients
-- ----------------------------
CREATE INDEX "idx_user_clients_client_id" ON "public"."user_clients" USING btree (
  "client_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table user_clients
-- ----------------------------
ALTER TABLE "public"."user_clients" ADD CONSTRAINT "user_clients_pkey" PRIMARY KEY ("user_id", "client_id");

-- ----------------------------
-- Indexes structure for table users
-- ----------------------------
CREATE INDEX "idx_users_created_at" ON "public"."users" USING btree (
  "created_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);

-- ----------------------------
-- Uniques structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table api_calls
-- ----------------------------
ALTER TABLE "public"."api_calls" ADD CONSTRAINT "api_calls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table user_clients
-- ----------------------------
ALTER TABLE "public"."user_clients" ADD CONSTRAINT "user_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients" ("client_id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."user_clients" ADD CONSTRAINT "user_clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
