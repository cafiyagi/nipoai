-- =============================================================================
-- NipoAI — Security Fixes Migration (idempotent)
-- =============================================================================
-- H-2: Ensure workspace_invitations table exists with RLS
-- L-2: Ensure report_template column exists on workspaces
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. workspace_invitations table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('admin', 'member')),
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invited_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wi_workspace_id ON public.workspace_invitations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_wi_email_status ON public.workspace_invitations (email, status)
    WHERE status = 'pending';

COMMENT ON TABLE public.workspace_invitations IS
    'Pending workspace invitations. Expired after 7 days by default.';

-- Enable RLS (idempotent)
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. RLS policies for workspace_invitations (drop + recreate for idempotency)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS wi_select ON public.workspace_invitations;
CREATE POLICY wi_select ON public.workspace_invitations
    FOR SELECT
    USING (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

DROP POLICY IF EXISTS wi_insert ON public.workspace_invitations;
CREATE POLICY wi_insert ON public.workspace_invitations
    FOR INSERT
    WITH CHECK (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

DROP POLICY IF EXISTS wi_update ON public.workspace_invitations;
CREATE POLICY wi_update ON public.workspace_invitations
    FOR UPDATE
    USING (
        public.is_workspace_admin(auth.uid(), workspace_id)
    )
    WITH CHECK (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

DROP POLICY IF EXISTS wi_delete ON public.workspace_invitations;
CREATE POLICY wi_delete ON public.workspace_invitations
    FOR DELETE
    USING (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

-- ---------------------------------------------------------------------------
-- 3. Add report_template column to workspaces (L-2)
-- ---------------------------------------------------------------------------
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS report_template JSONB;

COMMENT ON COLUMN public.workspaces.report_template IS
    'Custom report template sections (JSON array of {key, label, ai_hint}).';
