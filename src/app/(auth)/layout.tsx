import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            N
          </div>
          <span className="text-2xl font-bold text-gray-900">NipoAI</span>
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
