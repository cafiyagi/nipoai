-- Add admin_email, target_type, target_id columns to admin_audit_logs
alter table public.admin_audit_logs
  add column if not exists admin_email text,
  add column if not exists target_type text,
  add column if not exists target_id text;
