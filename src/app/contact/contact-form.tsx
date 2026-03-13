"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "送信に失敗しました。");
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "送信に失敗しました。時間をおいて再度お試しください。"
      );
    }
  }

  if (status === "success") {
    return (
      <div className="mt-10 rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          送信完了しました
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          お問い合わせありがとうございます。2営業日以内にご返信いたします。
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={() => setStatus("idle")}
        >
          新しいお問い合わせを送る
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* ── Email direct ── */}
      <div className="mt-10 rounded-xl border border-gray-100 bg-gray-50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              メールでのお問い合わせ
            </p>
            <a
              href="mailto:nipoaisupport@gmail.com"
              className="text-sm text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              nipoaisupport@gmail.com
            </a>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          通常、2営業日以内にご返信いたします。
        </p>
      </div>

      {/* ── Contact Form ── */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">
          お問い合わせフォーム
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          以下のフォームに必要事項をご記入のうえ、送信してください。
        </p>

        {status === "error" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <FormField
            id="name"
            label="お名前"
            type="text"
            placeholder="山田 太郎"
            required
            disabled={status === "submitting"}
          />
          <FormField
            id="email"
            label="メールアドレス"
            type="email"
            placeholder="taro@example.com"
            required
            disabled={status === "submitting"}
          />
          <FormField
            id="subject"
            label="件名"
            type="text"
            placeholder="お問い合わせの件名"
            required
            disabled={status === "submitting"}
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="message"
              className="text-sm font-medium text-gray-700"
            >
              お問い合わせ内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              required
              disabled={status === "submitting"}
              placeholder="お問い合わせ内容をご記入ください"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  送信する
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

function FormField({
  id,
  label,
  type,
  placeholder,
  required,
  disabled,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
}
