const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nipoai.vercel.app";

export function buildInviteEmailHtml(
  workspaceName: string,
  inviterName: string,
): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:40px;">
        <tr><td>
          <h1 style="font-size:20px;color:#111827;margin:0 0 8px;">NipoAIへの招待</h1>
          <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">
            ${inviterName}さんがあなたを「${workspaceName}」に招待しました。
          </p>
          <p style="font-size:14px;color:#374151;margin:0 0 24px;">
            下のボタンからアカウントを作成（またはログイン）すると、自動的にワークスペースに参加できます。
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#2563eb;border-radius:8px;padding:12px 24px;">
              <a href="${APP_URL}/signup" style="color:#fff;text-decoration:none;font-size:14px;font-weight:600;">アカウントを作成して参加</a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#9ca3af;margin:0;">
            すでにアカウントをお持ちの方は<a href="${APP_URL}/login" style="color:#2563eb;">ログイン</a>するだけで自動的に参加されます。
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
