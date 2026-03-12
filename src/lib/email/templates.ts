const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nipoai.com";

interface WelcomeEmailParams {
  workspaceName: string;
}

export function buildWelcomeEmail({ workspaceName }: WelcomeEmailParams) {
  const dashboardUrl = `${APP_URL}/dashboard`;

  const subject = "NipoAIへようこそ！";

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">NipoAI</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">ワークスペースの作成が完了しました</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
                <strong style="color:#18181b;">${escapeHtml(workspaceName)}</strong> が正常に作成されました。<br/>
                以下のステップでセットアップを進めましょう。
              </p>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                ${step(1, "Slack連携", "ワークスペースにSlackを接続して、日報の自動収集を開始します。")}
                ${step(2, "チャンネル選択", "日報を生成するチャンネルを選択します。")}
                ${step(3, "日報を生成", "AIが会話を要約し、日報を自動生成します。")}
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                      ダッシュボードを開く
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                このメールは NipoAI のアカウント作成時に自動送信されています。<br/>
                心当たりがない場合はこのメールを無視してください。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { subject, html };
}

function step(num: number, title: string, desc: string): string {
  return `
    <tr>
      <td style="padding:12px 0;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:36px;vertical-align:top;">
              <div style="width:28px;height:28px;border-radius:50%;background:#18181b;color:#fff;font-size:13px;font-weight:700;line-height:28px;text-align:center;">
                ${num}
              </div>
            </td>
            <td style="padding-left:12px;">
              <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">${title}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#71717a;line-height:1.5;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
