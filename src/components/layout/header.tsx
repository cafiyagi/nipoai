"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  title: string;
}

function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-[var(--border-primary)] bg-[var(--bg-card)] pl-16 pr-6 lg:px-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
    </header>
  );
}

export { Header };
