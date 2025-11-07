核心领域梳理

身份体系：users 主表承载多端登录信息，并通过 user_providers 管理第三方账号映射，积分流水与权益均从这里外键关联，详见 apps/api/app/models/users.py (line 11) 与 apps/api/app/models/user_providers.py (line 11)。
项目协作：projects、sessions、messages、tools_usage、user_requests 描述从用户指令到代理执行的全链路，表结构定义在 apps/api/app/models/projects.py (line 6) 等文件。
版本与配置：commits、env_vars、project_service_connections、service_tokens 用于记录代码快照、私密变量和外部服务接入，支撑未来多环境与多服务扩展。
计费与额度：point_transactions、payments、plans、allowances 及后续派生表构成完整的订阅、预付、用量结算闭环，均实现在 apps/api/app/models/billing.py (line 18) 与 apps/api/app/models/payments.py (line 18)。
Supabase 建库流程

在 Supabase Dashboard 创建新项目，记录 Project URL、service_role Key、数据库连接字符串，并将组织所属 Region 设为靠近主要用户的地域以降低网络延迟。
打开 SQL Editor，先执行枚举和表结构脚本；以下脚本直接使用 public schema，如果希望隔离，可在开头追加 create schema if not exists vibeany; set search_path to vibeany, public;。
运行下列 SQL 初始化所有枚举与表（一次执行即可）：
-- === Enums ===
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'point_transaction_type')
THEN CREATE TYPE point_transaction_type AS ENUM ('recharge','usage','adjustment','refund'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider')
THEN CREATE TYPE payment_provider AS ENUM ('stripe','paypal','creem'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status')
THEN CREATE TYPE payment_status AS ENUM ('created','requires_action','processing','succeeded','failed'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_shared_mode')
THEN CREATE TYPE plan_shared_mode AS ENUM ('shared_pool','hybrid'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allowance_type')
THEN CREATE TYPE allowance_type AS ENUM ('BC','RC','Usage'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allowance_window')
THEN CREATE TYPE allowance_window AS ENUM ('daily','monthly','yearly'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allowance_rollover_policy')
THEN CREATE TYPE allowance_rollover_policy AS ENUM ('none','1_cycle','annual'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status')
THEN CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'overage_charge_status')
THEN CREATE TYPE overage_charge_status AS ENUM ('pending','invoiced','paid','waived'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_guard_behavior')
THEN CREATE TYPE budget_guard_behavior AS ENUM ('suspend','throttle'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cost_metric')
THEN CREATE TYPE cost_metric AS ENUM ('BC','RC','Usage'); END IF; END $$;

-- === Identity & Access ===
CREATE TABLE IF NOT EXISTS users (
  id                VARCHAR(64) PRIMARY KEY,
  provider          VARCHAR(32) NOT NULL,
  provider_user_id  VARCHAR(128) NOT NULL,
  email             VARCHAR(255),
  name              VARCHAR(255),
  avatar_url        VARCHAR(512),
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  level             INTEGER NOT NULL DEFAULT 1,
  points            INTEGER NOT NULL DEFAULT 0,
  metadata_json     JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at     TIMESTAMPTZ,
  CONSTRAINT uq_user_provider UNIQUE (provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
CREATE INDEX IF NOT EXISTS idx_users_provider_user_id ON users(provider_user_id);

CREATE TABLE IF NOT EXISTS user_providers (
  id               VARCHAR(64) PRIMARY KEY,
  user_id          VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         VARCHAR(32) NOT NULL,
  provider_user_id VARCHAR(128) NOT NULL,
  access_token_hash VARCHAR(128),
  refresh_token_enc VARCHAR(1024),
  raw_profile      JSONB,
  linked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_provider_account UNIQUE (provider, provider_user_id),
  CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_user_providers_provider ON user_providers(provider);
CREATE INDEX IF NOT EXISTS idx_user_providers_user ON user_providers(user_id);

CREATE TABLE IF NOT EXISTS service_tokens (
  id         VARCHAR(36) PRIMARY KEY,
  provider   VARCHAR(50) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  token      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_service_tokens_provider ON service_tokens(provider);

-- === Project & Session ===
CREATE TABLE IF NOT EXISTS projects (
  id                     VARCHAR(64) PRIMARY KEY,
  name                   VARCHAR(255) NOT NULL,
  description            TEXT,
  status                 VARCHAR(32) NOT NULL DEFAULT 'idle',
  preview_url            VARCHAR(255),
  preview_port           INTEGER,
  repo_path              VARCHAR(1024),
  initial_prompt         TEXT,
  template_type          VARCHAR(64),
  active_claude_session_id VARCHAR(128),
  active_cursor_session_id VARCHAR(128),
  preferred_cli          VARCHAR(32) NOT NULL DEFAULT 'remote',
  selected_model         VARCHAR(64),
  fallback_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  settings               JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS sessions (
  id                VARCHAR(64) PRIMARY KEY,
  project_id        VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  claude_session_id VARCHAR(128),
  status            VARCHAR(32) NOT NULL DEFAULT 'active',
  model             VARCHAR(64),
  cli_type          VARCHAR(32) NOT NULL DEFAULT 'claude',
  transcript_path   VARCHAR(512),
  transcript_format VARCHAR(32) NOT NULL DEFAULT 'json',
  instruction       TEXT,
  summary           TEXT,
  total_messages    INTEGER NOT NULL DEFAULT 0,
  total_tools_used  INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER NOT NULL DEFAULT 0,
  total_cost_usd    NUMERIC(10,6),
  duration_ms       INTEGER,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_claude ON sessions(claude_session_id);

CREATE TABLE IF NOT EXISTS messages (
  id                 VARCHAR(64) PRIMARY KEY,
  project_id         VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role               VARCHAR(32) NOT NULL,
  message_type       VARCHAR(32),
  content            TEXT NOT NULL,
  metadata_json      JSONB,
  parent_message_id  VARCHAR(64) REFERENCES messages(id) ON DELETE SET NULL,
  session_id         VARCHAR(64) REFERENCES sessions(id) ON DELETE SET NULL,
  conversation_id    VARCHAR(64),
  duration_ms        INTEGER,
  token_count        INTEGER,
  cost_usd           NUMERIC(10,6),
  commit_sha         VARCHAR(64),
  cli_source         VARCHAR(32),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS tools_usage (
  id            VARCHAR(64) PRIMARY KEY,
  session_id    VARCHAR(64) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id    VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message_id    VARCHAR(64) REFERENCES messages(id) ON DELETE SET NULL,
  tool_name     VARCHAR(64) NOT NULL,
  tool_action   VARCHAR(32),
  input_data    JSONB,
  output_data   JSONB,
  files_affected JSONB,
  lines_added   INTEGER,
  lines_removed INTEGER,
  duration_ms   INTEGER,
  is_error      BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tools_usage_project ON tools_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_tools_usage_session ON tools_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_tools_usage_tool ON tools_usage(tool_name);

CREATE TABLE IF NOT EXISTS user_requests (
  id               VARCHAR(64) PRIMARY KEY,
  project_id       VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_message_id  VARCHAR(64) NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
  session_id       VARCHAR(64) REFERENCES sessions(id) ON DELETE SET NULL,
  instruction      TEXT NOT NULL,
  request_type     VARCHAR(16) NOT NULL DEFAULT 'act',
  is_completed     BOOLEAN NOT NULL DEFAULT FALSE,
  is_successful    BOOLEAN,
  result_metadata  JSONB,
  error_message    TEXT,
  cli_type_used    VARCHAR(32),
  model_used       VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_user_requests_project ON user_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_user_requests_session ON user_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_user_requests_completed ON user_requests(is_completed);

CREATE TABLE IF NOT EXISTS env_vars (
  id               VARCHAR(64) PRIMARY KEY,
  project_id       VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key              VARCHAR(128) NOT NULL,
  value_encrypted  TEXT NOT NULL,
  scope            VARCHAR(32) NOT NULL DEFAULT 'runtime',
  var_type         VARCHAR(32) NOT NULL DEFAULT 'string',
  is_secret        BOOLEAN NOT NULL DEFAULT TRUE,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_var UNIQUE (project_id, key, scope)
);
CREATE INDEX IF NOT EXISTS idx_env_vars_project ON env_vars(project_id);

CREATE TABLE IF NOT EXISTS project_service_connections (
  id           VARCHAR(64) PRIMARY KEY,
  project_id   VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider     VARCHAR(32) NOT NULL,
  status       VARCHAR(32) NOT NULL DEFAULT 'connected',
  service_data JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_project_services_project_provider ON project_service_connections(project_id, provider);
CREATE INDEX IF NOT EXISTS idx_project_services_provider_status ON project_service_connections(provider, status);

CREATE TABLE IF NOT EXISTS commits (
  id          VARCHAR(64) PRIMARY KEY,
  project_id  VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id  VARCHAR(64) REFERENCES sessions(id) ON DELETE SET NULL,
  commit_sha  VARCHAR(64) NOT NULL UNIQUE,
  parent_sha  VARCHAR(64),
  message     TEXT NOT NULL,
  author_type VARCHAR(32),
  author_name VARCHAR(128),
  author_email VARCHAR(255),
  files_changed JSONB,
  stats       JSONB,
  diff        TEXT,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commits_project ON commits(project_id);
CREATE INDEX IF NOT EXISTS idx_commits_session ON commits(session_id);

-- === Points & Payments ===
CREATE TABLE IF NOT EXISTS point_transactions (
  id             VARCHAR(64) PRIMARY KEY,
  user_id        VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           point_transaction_type NOT NULL,
  change         INTEGER NOT NULL,
  description    VARCHAR(255),
  balance_after  INTEGER NOT NULL,
  metadata_json  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id                   VARCHAR(64) PRIMARY KEY,
  user_id              VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider             payment_provider NOT NULL,
  status               payment_status NOT NULL DEFAULT 'created',
  amount               INTEGER NOT NULL,
  currency             VARCHAR(10) NOT NULL DEFAULT 'usd',
  package_id           VARCHAR(64),
  points               INTEGER,
  provider_payment_id  VARCHAR(128) NOT NULL,
  provider_customer_id VARCHAR(128),
  provider_receipt_url VARCHAR(512),
  raw_provider_payload JSONB,
  metadata_json        JSONB,
  point_transaction_id VARCHAR(64),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at         TIMESTAMPTZ,
  CONSTRAINT uq_payment_provider_id UNIQUE (provider, provider_payment_id)
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- === Plans & Allowances ===
CREATE TABLE IF NOT EXISTS plans (
  id               VARCHAR(36) PRIMARY KEY,
  name             VARCHAR(64) NOT NULL UNIQUE,
  description      TEXT,
  bc_monthly       INTEGER NOT NULL,
  rc_monthly       INTEGER NOT NULL,
  usage_bonus_rate NUMERIC(5,4),
  trial_days       INTEGER NOT NULL DEFAULT 1,
  shared_mode      plan_shared_mode NOT NULL,
  payg_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  price_usd        NUMERIC(10,2) NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS allowances (
  id               VARCHAR(36) PRIMARY KEY,
  user_id          VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id          VARCHAR(36) REFERENCES plans(id) ON DELETE SET NULL,
  type             allowance_type NOT NULL,
  total            INTEGER NOT NULL,
  used             INTEGER NOT NULL DEFAULT 0,
  window           allowance_window NOT NULL,
  rollover_policy  allowance_rollover_policy NOT NULL DEFAULT 'none',
  expires_at       TIMESTAMPTZ,
  source           VARCHAR(64),
  metadata_json    JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_allowance_user_plan_type UNIQUE (user_id, plan_id, type, source)
);
CREATE INDEX IF NOT EXISTS idx_allowances_user ON allowances(user_id);
CREATE INDEX IF NOT EXISTS idx_allowances_plan ON allowances(plan_id);

CREATE TABLE IF NOT EXISTS rollover_buckets (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allowance_id  VARCHAR(36) NOT NULL REFERENCES allowances(id) ON DELETE CASCADE,
  remain        INTEGER NOT NULL,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rollover_buckets_user ON rollover_buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_rollover_buckets_allowance ON rollover_buckets(allowance_id);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                   VARCHAR(36) PRIMARY KEY,
  user_id              VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id              VARCHAR(36) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  status               subscription_status NOT NULL DEFAULT 'trialing',
  payg_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  is_primary           BOOLEAN NOT NULL DEFAULT TRUE,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end   TIMESTAMPTZ,
  trial_ends_at        TIMESTAMPTZ,
  canceled_at          TIMESTAMPTZ,
  metadata_json        JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_plan_membership UNIQUE (user_id, plan_id)
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan_id);

CREATE TABLE IF NOT EXISTS consumption_events (
  id             VARCHAR(36) PRIMARY KEY,
  user_id        VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allowance_id   VARCHAR(36) REFERENCES allowances(id) ON DELETE SET NULL,
  type           VARCHAR(64) NOT NULL,
  amount         INTEGER NOT NULL,
  complexity_score INTEGER NOT NULL DEFAULT 0,
  action_hash    VARCHAR(128) NOT NULL UNIQUE,
  metadata_json  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consumption_events_user ON consumption_events(user_id);

CREATE TABLE IF NOT EXISTS usage_meter_readings (
  id           VARCHAR(36) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  user_id      VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  metric       VARCHAR(64) NOT NULL,
  value        NUMERIC(16,4) NOT NULL,
  period       VARCHAR(32) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end   TIMESTAMPTZ NOT NULL,
  metadata_json JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_meter_workspace ON usage_meter_readings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_meter_metric ON usage_meter_readings(metric);

CREATE TABLE IF NOT EXISTS usage_summaries (
  id             VARCHAR(36) PRIMARY KEY,
  workspace_id   VARCHAR(64) NOT NULL,
  user_id        VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  metric         VARCHAR(64) NOT NULL,
  period         VARCHAR(32) NOT NULL,
  value          NUMERIC(16,4) NOT NULL,
  overage_amount NUMERIC(16,4),
  currency       VARCHAR(8) NOT NULL DEFAULT 'usd',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_usage_summary_period UNIQUE (workspace_id, metric, period)
);
CREATE INDEX IF NOT EXISTS idx_usage_summaries_metric ON usage_summaries(metric);

CREATE TABLE IF NOT EXISTS overage_charges (
  id               VARCHAR(36) PRIMARY KEY,
  user_id          VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id     VARCHAR(64),
  metric           VARCHAR(64) NOT NULL,
  amount           NUMERIC(12,4) NOT NULL,
  currency         VARCHAR(8) NOT NULL DEFAULT 'usd',
  status           overage_charge_status NOT NULL DEFAULT 'pending',
  usage_summary_id VARCHAR(36) REFERENCES usage_summaries(id) ON DELETE SET NULL,
  metadata_json    JSONB,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  invoiced_at      TIMESTAMPTZ,
  settled_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_overage_charges_user ON overage_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_overage_charges_status ON overage_charges(status);

CREATE TABLE IF NOT EXISTS budget_guards (
  id                  VARCHAR(36) PRIMARY KEY,
  user_id             VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id        VARCHAR(64),
  monthly_cap         NUMERIC(10,2) NOT NULL,
  behavior            budget_guard_behavior NOT NULL DEFAULT 'throttle',
  notify              BOOLEAN NOT NULL DEFAULT TRUE,
  currency            VARCHAR(8) NOT NULL DEFAULT 'usd',
  current_window_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_budget_guard_workspace UNIQUE (user_id, workspace_id)
);
CREATE INDEX IF NOT EXISTS idx_budget_guards_user ON budget_guards(user_id);

CREATE TABLE IF NOT EXISTS allowance_daily_autofix (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_key   VARCHAR(16) NOT NULL,
  consumed   INTEGER NOT NULL DEFAULT 0,
  "limit"    INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_autofix_user_date UNIQUE (user_id, date_key)
);
CREATE INDEX IF NOT EXISTS idx_autofix_user ON allowance_daily_autofix(user_id);

CREATE TABLE IF NOT EXISTS cost_models (
  id           VARCHAR(36) PRIMARY KEY,
  metric       cost_metric NOT NULL UNIQUE,
  unit         VARCHAR(32) NOT NULL,
  formula      TEXT NOT NULL,
  base_rate    NUMERIC(12,6) NOT NULL,
  currency     VARCHAR(8) NOT NULL DEFAULT 'usd',
  metadata_json JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
在 Supabase Storage/Authentication 上启用 RLS 前先确认 API 服务将使用 service key 访问，可暂时保持默认关闭 RLS；若需上线外网，可按模块补充策略，仅允许 API Role 访问各表。
如需测试，使用 Supabase Table Editor 为 users、projects 插入少量样例数据，确认外键约束和 JSONB 字段可写。
本地项目配置

增加数据库驱动：在 apps/api/requirements.txt 追加 psycopg[binary]>=3.1，确保 pip install -r apps/api/requirements.txt 后具备 PostgreSQL 访问能力。
更新数据库连接逻辑：apps/api/app/db/session.py (line 6) 仅在 SQLite 时创建本地目录，换成
if settings.database_url.startswith("sqlite"):
    db_path = settings.database_url.replace("sqlite:///", "")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}
避免对 Supabase 连接字符串执行 Path(...)。
设置环境变量：在 .env 或项目启动的 shell 中添加
DATABASE_URL="postgresql+psycopg://postgres:<service_role_password>@db.<project-ref>.supabase.co:5432/postgres"
与 apps/api/app/core/config.py (line 40) 读取逻辑相匹配，推荐使用 postgresql+psycopg 前缀获得最佳兼容性。
启动后端：在 apps/api 目录运行 uvicorn app.main:app --reload，确认日志输出 Initializing database tables 后不会抛出路径异常；首次连接 Supabase 时 SQLAlchemy 会根据 metadata 自动对比并补齐缺失对象（已经由脚本创建的话不会重复生成）。
校验 API：调用 /api/projects、/api/points/balance 等路由，观察 Supabase Dashboard 的 query log，确认写入/读取都指向远端数据库。
数据迁移与验证

若已有 SQLite 历史数据，可通过 sqlite3 cc.db .dump 导出，再用 pgloader 或 python 脚本读取老库逐表写入 Supabase，迁移顺序建议先无外键表。
迁移后运行一遍 apps/api/app/scripts/billing_tasks.py 内的对账脚本，确认积分、订阅余额计算正确。
在 Staging 环境开启代理生成/部署流程，确保高频写入（消息、工具调用）在网络时延下保持可接受性能。
观察 Supabase 监控面板的连接池占用，如需高并发可在 create_engine 添加 pool_size、max_overflow 参数。
后续扩展建议

结合 Supabase 变更历史启用 pg_cron 或 supabase_db_audit 扩展，记录高价值表的审计日志。
引入 Alembic（新建 alembic/ 目录）管理迁移，避免后续手写 SQL 与 SQLAlchemy 定义不一致。
对高基数日志表（如 messages、tools_usage）设置分区或归档策略，保障查询性能。
使用 Supabase Functions 暴露受限查询（例如只读报表），减少 API 服务额外负载。
下一步建议先完成依赖与配置修改，然后在测试环境跑通整套流程，再考虑引入 Alembic 迁移与 RLS 规则收紧。