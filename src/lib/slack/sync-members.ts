import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebClient } from "@slack/web-api";

/**
 * Sync Slack user IDs to profiles by matching on email.
 *
 * Fetches all members from the Slack workspace via `users.list`,
 * then updates `profiles.slack_user_id` for each email match
 * within the given workspace's membership.
 */
export async function syncSlackMembers(
  slack: WebClient,
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<{ synced: number; errors: number }> {
  // 1. Get workspace members with their profile emails
  const { data: members, error: membersError } = await supabase
    .from("user_workspace_memberships")
    .select("user_id, profiles(email)")
    .eq("workspace_id", workspaceId);

  if (membersError || !members) {
    console.error("[sync-members] Failed to fetch workspace members:", membersError);
    return { synced: 0, errors: 1 };
  }

  // 2. Fetch Slack users (paginated)
  const slackEmailMap = new Map<string, string>(); // email -> slack_user_id
  let cursor: string | undefined;

  do {
    const result = await slack.users.list({ cursor, limit: 200 });

    for (const member of result.members ?? []) {
      if (member.deleted || member.is_bot || !member.profile?.email || !member.id) {
        continue;
      }
      slackEmailMap.set(member.profile.email.toLowerCase(), member.id);
    }

    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);

  // 3. Match and update
  let synced = 0;
  let errors = 0;

  for (const member of members) {
    const profile = member.profiles as unknown as { email: string } | null;
    if (!profile?.email) continue;

    const slackUserId = slackEmailMap.get(profile.email.toLowerCase());
    if (!slackUserId) continue;

    const { error } = await supabase
      .from("profiles")
      .update({ slack_user_id: slackUserId })
      .eq("id", member.user_id);

    if (error) {
      console.error(`[sync-members] Failed to update profile ${member.user_id}:`, error);
      errors++;
    } else {
      synced++;
    }
  }

  return { synced, errors };
}
