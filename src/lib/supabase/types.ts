/**
 * Database type definitions for Supabase.
 *
 * These types are maintained manually to match the SQL schema
 * defined in supabase/migrations/. Run `supabase gen types` to
 * regenerate from the live database when the schema drifts.
 */

import type { ReportTemplate } from "@/lib/report-template";

// ---------------------------------------------------------------------------
// Enum-like union types
// ---------------------------------------------------------------------------

export type Plan = "free" | "starter" | "team";
export type WorkspaceRole = "admin" | "member";
export type ReportStatus = "generating" | "draft" | "submitted" | "delivered";
export type DeliveryChannel = "slack_dm" | "slack_channel" | "email";
export type DeliveryStatus = "pending" | "sent" | "failed";
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing";

// ---------------------------------------------------------------------------
// JSON column shapes
// ---------------------------------------------------------------------------

/**
 * Report content is a dynamic map of section keys to string arrays.
 * The keys correspond to the workspace's report_template sections.
 * For backwards compatibility, code can still access `.achievements`,
 * `.challenges`, etc. — they are valid string keys on Record<string, string[]>.
 */
export type ReportContent = Record<string, string[]>;

// ---------------------------------------------------------------------------
// Table definitions
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };

      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: Plan;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          report_generation_time: string;
          timezone: string;
          report_template: ReportTemplate;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: Plan;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          report_generation_time?: string;
          timezone?: string;
          report_template?: ReportTemplate;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          plan?: Plan;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          report_generation_time?: string;
          timezone?: string;
          report_template?: ReportTemplate;
          created_at?: string;
        };
      };

      user_workspace_memberships: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
      };

      slack_integrations: {
        Row: {
          id: string;
          workspace_id: string;
          slack_team_id: string;
          slack_team_name: string | null;
          encrypted_bot_token: string;
          encrypted_user_token: string | null;
          bot_user_id: string | null;
          selected_channel_ids: string[];
          installed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          slack_team_id: string;
          slack_team_name?: string | null;
          encrypted_bot_token: string;
          encrypted_user_token?: string | null;
          bot_user_id?: string | null;
          selected_channel_ids?: string[];
          installed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          slack_team_id?: string;
          slack_team_name?: string | null;
          encrypted_bot_token?: string;
          encrypted_user_token?: string | null;
          bot_user_id?: string | null;
          selected_channel_ids?: string[];
          installed_by?: string | null;
          created_at?: string;
        };
      };

      daily_reports: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          report_date: string;
          status: ReportStatus;
          content: ReportContent;
          ai_model: string | null;
          token_usage: number | null;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          report_date: string;
          status?: ReportStatus;
          content: ReportContent;
          ai_model?: string | null;
          token_usage?: number | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          report_date?: string;
          status?: ReportStatus;
          content?: ReportContent;
          ai_model?: string | null;
          token_usage?: number | null;
          submitted_at?: string | null;
          created_at?: string;
        };
      };

      report_deliveries: {
        Row: {
          id: string;
          report_id: string;
          channel: DeliveryChannel;
          recipient: string;
          status: DeliveryStatus;
          sent_at: string | null;
          error_message: string | null;
          retry_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          channel: DeliveryChannel;
          recipient: string;
          status?: DeliveryStatus;
          sent_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          channel?: DeliveryChannel;
          recipient?: string;
          status?: DeliveryStatus;
          sent_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
        };
      };

      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          stripe_subscription_id: string | null;
          plan: Plan;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          canceled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          stripe_subscription_id?: string | null;
          plan: Plan;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          canceled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          stripe_subscription_id?: string | null;
          plan?: Plan;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          canceled_at?: string | null;
          created_at?: string;
        };
      };
    };

    Functions: {
      get_user_workspace_ids: {
        Args: { user_uuid: string };
        Returns: string[];
      };
      is_workspace_admin: {
        Args: { user_uuid: string; ws_uuid: string };
        Returns: boolean;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Convenience helpers — use these instead of reaching into Database directly
// ---------------------------------------------------------------------------

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type ProfileInsert = Tables["profiles"]["Insert"];
export type ProfileUpdate = Tables["profiles"]["Update"];

export type Workspace = Tables["workspaces"]["Row"];
export type WorkspaceInsert = Tables["workspaces"]["Insert"];
export type WorkspaceUpdate = Tables["workspaces"]["Update"];

export type UserWorkspaceMembership =
  Tables["user_workspace_memberships"]["Row"];
export type UserWorkspaceMembershipInsert =
  Tables["user_workspace_memberships"]["Insert"];
export type UserWorkspaceMembershipUpdate =
  Tables["user_workspace_memberships"]["Update"];

export type SlackIntegration = Tables["slack_integrations"]["Row"];
export type SlackIntegrationInsert = Tables["slack_integrations"]["Insert"];
export type SlackIntegrationUpdate = Tables["slack_integrations"]["Update"];

export type DailyReport = Tables["daily_reports"]["Row"];
export type DailyReportInsert = Tables["daily_reports"]["Insert"];
export type DailyReportUpdate = Tables["daily_reports"]["Update"];

export type ReportDelivery = Tables["report_deliveries"]["Row"];
export type ReportDeliveryInsert = Tables["report_deliveries"]["Insert"];
export type ReportDeliveryUpdate = Tables["report_deliveries"]["Update"];

export type Subscription = Tables["subscriptions"]["Row"];
export type SubscriptionInsert = Tables["subscriptions"]["Insert"];
export type SubscriptionUpdate = Tables["subscriptions"]["Update"];
