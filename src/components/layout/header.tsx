"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  title: string;
}

function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
    </header>
  );
}

export { Header };
