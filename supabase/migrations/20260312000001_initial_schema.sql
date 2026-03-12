-- =============================================================================
-- NipoAI — Initial Schema
-- =============================================================================
-- This migration creates the core tables required by the application.
-- All tables live in the `public` schema and reference `auth.users(id)` for
-- user identity.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 1. profiles — mirrors auth.users for public access
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    display_name TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
    'Public user profile synced from auth.users via trigger.';

-- ---------------------------------------------------------------------------
-- 2. workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE public.workspaces (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT NOT NULL,
    slug                    TEXT NOT NULL,
    plan                    TEXT NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free', 'starter', 'team')),
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    report_generation_time  TEXT NOT NULL DEFAULT '17:30',
    timezone                TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces
    ADD CONSTRAINT workspaces_slug_unique UNIQUE (slug);

CREATE INDEX idx_workspaces_slug ON public.workspaces (slug);

COMMENT ON TABLE public.workspaces IS
    'A workspace groups users and owns reports, integrations, and a subscription.';

-- ---------------------------------------------------------------------------
-- 3. user_workspace_memberships
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_workspace_memberships (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    role          TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('admin', 'member')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_workspace_memberships
    ADD CONSTRAINT uwm_user_workspace_unique UNIQUE (user_id, workspace_id);

CREATE INDEX idx_uwm_user_id      ON public.user_workspace_memberships (user_id);
CREATE INDEX idx_uwm_workspace_id ON public.user_workspace_memberships (workspace_id);

COMMENT ON TABLE public.user_workspace_memberships IS
    'Junction table linking users to workspaces with a role.';

-- ---------------------------------------------------------------------------
-- 4. slack_integrations
-- ---------------------------------------------------------------------------
CREATE TABLE public.slack_integrations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id          UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    slack_team_id         TEXT NOT NULL,
    slack_team_name       TEXT,
    encrypted_bot_token   TEXT NOT NULL,
    selected_channel_ids  JSONB NOT NULL DEFAULT '[]'::jsonb,
    installed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_slack_workspace_id ON public.slack_integrations (workspace_id);
CREATE UNIQUE INDEX idx_slack_workspace_team
    ON public.slack_integrations (workspace_id, slack_team_id);

COMMENT ON TABLE public.slack_integrations IS
    'Slack OAuth installation data. Bot tokens are AES-256-GCM encrypted.';

-- ---------------------------------------------------------------------------
-- 5. daily_reports
-- ---------------------------------------------------------------------------
CREATE TABLE public.daily_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_date     DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('generating', 'draft', 'submitted', 'delivered')),
    content         JSONB NOT NULL DEFAULT '{
        "achievements": [],
        "challenges": [],
        "tomorrow_plan": [],
        "remarks": []
    }'::jsonb,
    ai_model        TEXT,
    token_usage     INTEGER,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_reports
    ADD CONSTRAINT dr_workspace_user_date_unique
        UNIQUE (workspace_id, user_id, report_date);

CREATE INDEX idx_dr_workspace_date
    ON public.daily_reports (workspace_id, report_date DESC);
CREATE INDEX idx_dr_user_id
    ON public.daily_reports (user_id);
CREATE INDEX idx_dr_status
    ON public.daily_reports (status)
    WHERE status IN ('generating', 'submitted');

COMMENT ON TABLE public.daily_reports IS
    'One report per user per day per workspace.';

-- ---------------------------------------------------------------------------
-- 6. report_deliveries
-- ---------------------------------------------------------------------------
CREATE TABLE public.report_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
    channel         TEXT NOT NULL
                    CHECK (channel IN ('slack_dm', 'slack_channel', 'email')),
    recipient       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rd_report_id ON public.report_deliveries (report_id);
CREATE INDEX idx_rd_status
    ON public.report_deliveries (status)
    WHERE status = 'pending';

COMMENT ON TABLE public.report_deliveries IS
    'Tracks every delivery attempt for a report (Slack DM, channel, email).';

-- ---------------------------------------------------------------------------
-- 7. subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE public.subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    stripe_subscription_id  TEXT,
    plan                    TEXT NOT NULL
                            CHECK (plan IN ('free', 'starter', 'team')),
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    canceled_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_workspace_id ON public.subscriptions (workspace_id);
CREATE UNIQUE INDEX idx_sub_stripe_id
    ON public.subscriptions (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON TABLE public.subscriptions IS
    'Stripe subscription state synced via webhooks.';

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables (policies are defined in the next migration)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_integrations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_deliveries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions              ENABLE ROW LEVEL SECURITY;
