-- ==============================================================================
-- Ai Anveshana Agentic Orchestrator - Supabase Multi-Tenant Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/qwutrfmmcorktztefrja/sql
-- ==============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. REPOSITORIES TABLE (Scoped to User / Organization)
CREATE TABLE IF NOT EXISTS public.repositories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    created_by VARCHAR(100) NOT NULL DEFAULT 'Ganesh',
    github_owner VARCHAR(100) NOT NULL,
    repository_name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    default_branch VARCHAR(100) NOT NULL DEFAULT 'master',
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    credential_id BIGINT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MACHINES TABLE (Scoped to User / Organization)
CREATE TABLE IF NOT EXISTS public.machines (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    created_by VARCHAR(100) NOT NULL DEFAULT 'Ganesh',
    machine_name VARCHAR(100) NOT NULL,
    machine_id VARCHAR(100) UNIQUE NOT NULL,
    hostname VARCHAR(255),
    ip_address VARCHAR(100),
    operating_system VARCHAR(100) DEFAULT 'Windows',
    python_version VARCHAR(50),
    agent_version VARCHAR(50) DEFAULT '1.0.0',
    status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
    last_heartbeat TIMESTAMPTZ,
    cpu_usage REAL DEFAULT 0.0,
    memory_usage REAL DEFAULT 0.0,
    disk_usage REAL DEFAULT 0.0,
    current_job_id VARCHAR(100),
    registration_token VARCHAR(255),
    agent_token_hash VARCHAR(255),
    registered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. JOBS TABLE (Scoped to User / Organization)
CREATE TABLE IF NOT EXISTS public.jobs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    created_by VARCHAR(100) NOT NULL DEFAULT 'Ganesh',
    job_id VARCHAR(100) UNIQUE NOT NULL,
    repository_id BIGINT REFERENCES public.repositories(id) ON DELETE SET NULL,
    repository_name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    branch VARCHAR(100) NOT NULL DEFAULT 'master',
    commit_sha VARCHAR(100),
    entry_point VARCHAR(255) NOT NULL DEFAULT 'main.py',
    machine_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    parameters JSONB DEFAULT '[]'::jsonb,
    environment_variables JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds REAL,
    exit_code INTEGER,
    error_message TEXT,
    error_type VARCHAR(50) DEFAULT 'NONE',
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 0,
    timeout_seconds INTEGER NOT NULL DEFAULT 1800,
    schedule_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. JOB LOGS TABLE
CREATE TABLE IF NOT EXISTS public.job_logs (
    id BIGSERIAL PRIMARY KEY,
    job_id VARCHAR(100) NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(50) NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL
);

-- 6. SCHEDULES TABLE (Scoped to User / Organization)
CREATE TABLE IF NOT EXISTS public.schedules (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    created_by VARCHAR(100) NOT NULL DEFAULT 'Ganesh',
    name VARCHAR(255) NOT NULL,
    repository_id BIGINT,
    repository_name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    branch VARCHAR(100) NOT NULL DEFAULT 'master',
    entry_point VARCHAR(255) NOT NULL DEFAULT 'main.py',
    machine_id VARCHAR(100) NOT NULL,
    schedule_type VARCHAR(50) NOT NULL DEFAULT 'CRON',
    cron_expression VARCHAR(100) DEFAULT '0 8 * * *',
    interval_minutes INTEGER DEFAULT 60,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    parameters JSONB DEFAULT '[]'::jsonb,
    environment_variables JSONB DEFAULT '{}'::jsonb,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    last_job_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CREDENTIALS TABLE (Scoped to User / Organization)
CREATE TABLE IF NOT EXISTS public.credentials (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    created_by VARCHAR(100) NOT NULL DEFAULT 'Ganesh',
    name VARCHAR(255) NOT NULL,
    credential_type VARCHAR(50) NOT NULL DEFAULT 'GITHUB_PAT',
    encrypted_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AUDIT LOGS TABLE (Scoped to User)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id BIGINT,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100)
);

-- ENSURE COLUMNS EXIST IN EXISTING TABLES
ALTER TABLE public.repositories ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'Ganesh';
ALTER TABLE public.repositories ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'Ganesh';
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'Ganesh';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'Ganesh';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE public.credentials ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'Ganesh';
ALTER TABLE public.credentials ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- DISABLE RLS TO ALLOW FULL DIRECT WEB CLIENT OPERATIONS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- SEED PRIMARY USERS
INSERT INTO public.users (username, email, password_hash, role)
VALUES 
('Ganesh', 'ganesh@aianveshana.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ADMIN'),
('Admin', 'admin@aianveshana.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

-- ENABLE REAL-TIME REPLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.machines, public.jobs, public.job_logs, public.schedules;
