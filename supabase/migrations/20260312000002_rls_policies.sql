-- =============================================================================
-- NipoAI — Row-Level Security Policies
-- =============================================================================
-- This migration defines:
--   1. Helper functions used by RLS policies
--   2. RLS policies for every public table
--   3. Trigger to auto-create a profile on sign-up
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper functions
-- ---------------------------------------------------------------------------

-- Return the set of workspace IDs a user belongs to.
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT workspace_id
    FROM public.user_workspace_memberships
    WHERE user_id = user_uuid;
$$;

COMMENT ON FUNCTION public.get_user_workspace_ids IS
    'Returns all workspace IDs the given user is a member of.';

-- Check whether a user holds the admin role in a specific workspace.
CREATE OR REPLACE FUNCTION public.is_workspace_admin(user_uuid UUID, ws_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_workspace_memberships
        WHERE user_id      = user_uuid
          AND workspace_id = ws_uuid
          AND role         = 'admin'
    );
$$;

COMMENT ON FUNCTION public.is_workspace_admin IS
    'Returns true if the user is an admin of the given workspace.';

-- ---------------------------------------------------------------------------
-- 2. Auto-create profile trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.on_auth_user_created();

COMMENT ON FUNCTION public.on_auth_user_created IS
    'Creates a public.profiles row when a new user signs up.';

-- ---------------------------------------------------------------------------
-- 3. RLS policies — profiles
-- ---------------------------------------------------------------------------

-- Users can read any profile (needed for displaying team member names).
CREATE POLICY profiles_select ON public.profiles
    FOR SELECT
    USING (true);

-- Users can update only their own profile.
CREATE POLICY profiles_update ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 4. RLS policies — workspaces
-- ---------------------------------------------------------------------------

-- Members can read workspaces they belong to.
CREATE POLICY workspaces_select ON public.workspaces
    FOR SELECT
    USING (
        id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    );

-- Only admins can update workspace settings.
CREATE POLICY workspaces_update ON public.workspaces
    FOR UPDATE
    USING (
        public.is_workspace_admin(auth.uid(), id)
    )
    WITH CHECK (
        public.is_workspace_admin(auth.uid(), id)
    );

-- Any authenticated user can create a workspace (they become admin via app logic).
CREATE POLICY workspaces_insert ON public.workspaces
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 5. RLS policies — user_workspace_memberships
-- ---------------------------------------------------------------------------

-- Members of the same workspace can see each other.
CREATE POLICY uwm_select ON public.user_workspace_memberships
    FOR SELECT
    USING (
        workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    );

-- Only workspace admins can add members.
CREATE POLICY uwm_insert ON public.user_workspace_memberships
    FOR INSERT
    WITH CHECK (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

-- Only workspace admins can remove members.
CREATE POLICY uwm_delete ON public.user_workspace_memberships
    FOR DELETE
    USING (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

-- ---------------------------------------------------------------------------
-- 6. RLS policies — slack_integrations
-- ---------------------------------------------------------------------------

-- Only workspace admins can view Slack integrations.
CREATE POLICY slack_select ON public.slack_integrations
    FOR SELECT
    USING (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

-- Only workspace admins can create Slack integrations.
CREATE POLICY slack_insert ON public.slack_integrations
    FOR INSERT
    WITH CHECK (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

-- Only workspace admins can update Slack integrations.
CREATE POLICY slack_update ON public.slack_integrations
    FOR UPDATE
    USING (
        public.is_workspace_admin(auth.uid(), workspace_id)
    )
    WITH CHECK (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

-- Only workspace admins can delete Slack integrations.
CREATE POLICY slack_delete ON public.slack_integrations
    FOR DELETE
    USING (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );

-- ---------------------------------------------------------------------------
-- 7. RLS policies — daily_reports
-- ---------------------------------------------------------------------------

-- Report owner can always see their own reports.
-- Workspace admins can see all reports in their workspace.
CREATE POLICY dr_select ON public.daily_reports
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_workspace_admin(auth.uid(), workspace_id)
    );

-- Authenticated users can create reports for themselves.
CREATE POLICY dr_insert ON public.daily_reports
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    );

-- Only the report owner can update their report.
CREATE POLICY dr_update ON public.daily_reports
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 8. RLS policies — report_deliveries
-- ---------------------------------------------------------------------------

-- Report owner or workspace admin can see delivery status.
CREATE POLICY rd_select ON public.report_deliveries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.daily_reports dr
            WHERE dr.id = report_deliveries.report_id
              AND (
                  dr.user_id = auth.uid()
                  OR public.is_workspace_admin(auth.uid(), dr.workspace_id)
              )
        )
    );

-- ---------------------------------------------------------------------------
-- 9. RLS policies — subscriptions
-- ---------------------------------------------------------------------------

-- Only workspace admins can view subscription data.
CREATE POLICY sub_select ON public.subscriptions
    FOR SELECT
    USING (
        public.is_workspace_admin(auth.uid(), workspace_id)
    );
