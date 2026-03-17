import type { ReportContent } from "@/lib/supabase/types";
import type { ReportTemplate } from "@/lib/report-template";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SECTION_ICONS: Record<string, string> = {
  achievements: "\u2705",
  challenges: "\u26A0\uFE0F",
  tomorrow_plan: "\uD83D\uDCC5",
  remarks: "\uD83D\uDCDD",
};

interface FormatReportEmailParams {
  content: ReportContent;
  template: ReportTemplate;
  userName: string;
  reportDate: string;
  workspaceName: string;
}

export function formatReportEmailHtml({
  content,
  template,
  userName,
  reportDate,
  workspaceName,
}: FormatReportEmailParams): string {
  const safeUserName = escapeHtml(userName);
  const safeWorkspace = escapeHtml(workspaceName);
  const safeDate = escapeHtml(reportDate);

  const sectionsHtml = template
    .map((section) => {
      const items = content[section.key] ?? [];
      if (items.length === 0) return "";

      const icon = SECTION_ICONS[section.key] ?? "\u25B8";
      const safeLabel = escapeHtml(section.label);
      const itemsHtml = items
        .map(
          (item) =>
            `<li style="margin:0 0 6px;font-size:14px;color:#374151;line-height:1.6;">${escapeHtml(item)}</li>`,
        )
        .join("");

      return `
        <tr>
          <td style="padding:16px 0 8px;">
            <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">
              ${icon} ${safeLabel}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 8px 8px;">
            <ul style="margin:0;padding:0 0 0 16px;">
              ${itemsHtml}
            </ul>
          </td>
        </tr>`;
    })
    .filter(Boolean)
    .join("");

  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:32px 40px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">NipoAI</h1>
                  </td>
                  <td align="right">
                    <span style="color:#a1a1aa;font-size:13px;">日報レポート</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Meta -->
          <tr>
            <td style="padding:32px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:8px;border:1px solid #e4e4e7;padding:16px 20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">報告者</p>
                    <p style="margin:0;font-size:15px;color:#18181b;font-weight:600;">${safeUserName}</p>
                  </td>
                  <td align="center">
                    <p style="margin:0 0 4px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">日付</p>
                    <p style="margin:0;font-size:15px;color:#18181b;font-weight:600;">${safeDate}</p>
                  </td>
                  <td align="right">
                    <p style="margin:0 0 4px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">ワークスペース</p>
                    <p style="margin:0;font-size:15px;color:#18181b;font-weight:600;">${safeWorkspace}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sections -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${sectionsHtml}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                NipoAI - AI日報自動生成<br/>
                このメールはNipoAIから自動送信されています。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
