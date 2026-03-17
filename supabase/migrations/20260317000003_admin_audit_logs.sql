-- Admin audit logs for tracking sensitive admin operations
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  target_user_id uuid,
  action text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Index for efficient lookups by action and time
create index idx_admin_audit_logs_action_created
  on public.admin_audit_logs (action, created_at desc);

-- Index for lookups by admin user
create index idx_admin_audit_logs_admin_user
  on public.admin_audit_logs (admin_user_id, created_at desc);

-- RLS: only service role can access (no direct browser access)
alter table public.admin_audit_logs enable row level security;
