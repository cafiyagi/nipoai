import { NextRequest, NextResponse } from "next/server";
import { getResendClient } from "@/lib/email/client";

const SUPPORT_EMAIL = "nipoaisupport@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "全ての項目を入力してください。" },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください。" },
        { status: 400 }
      );
    }

    const resend = getResendClient();

    if (!resend) {
      // Fallback: log to console if Resend is not configured
      console.log("[contact] Resend not configured. Contact form submission:", {
        name,
        email,
        subject,
        message,
      });
      return NextResponse.json({ success: true });
    }

    await resend.emails.send({
      from: "NipoAI <noreply@nipoai.app>",
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `[お問い合わせ] ${subject}`,
      text: `お名前: ${name}\nメールアドレス: ${email}\n件名: ${subject}\n\n${message}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #1e40af;">NipoAI お問い合わせ</h2>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; width: 120px;">お名前</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">メール</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">件名</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(subject)}</td></tr>
          </table>
          <div style="padding: 16px; background: #f9fafb; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(message)}</div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[contact] Failed to send email:", error);
    return NextResponse.json(
      { error: "送信に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
