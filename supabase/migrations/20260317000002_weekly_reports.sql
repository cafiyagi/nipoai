-- Weekly reports table for Starter+ plan
CREATE TABLE public.weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_report_ids UUID[] NOT NULL DEFAULT '{}',
    ai_model TEXT,
    token_usage INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS: users can read their own weekly reports
CREATE POLICY "Users can read own weekly reports"
    ON public.weekly_reports FOR SELECT
    USING (
        user_id = auth.uid()
        OR workspace_id IN (
            SELECT workspace_id FROM public.user_workspace_memberships
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS: service role can insert/update (API routes use admin client)
CREATE POLICY "Service role can manage weekly reports"
    ON public.weekly_reports FOR ALL
    USING (true)
    WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_weekly_reports_workspace_user
    ON public.weekly_reports (workspace_id, user_id, week_start DESC);
