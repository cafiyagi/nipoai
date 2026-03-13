"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SidebarUser {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface SidebarWorkspace {
  id: string;
  name: string;
}

export interface SidebarProps {
  user: SidebarUser;
  workspaces: SidebarWorkspace[];
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard", icon: Home },
  { label: "日報一覧", href: "/dashboard/reports", icon: FileText },
  { label: "チーム", href: "/dashboard/team", icon: Users },
  { label: "設定", href: "/dashboard/settings", icon: Settings },
];

// ---------------------------------------------------------------------------
// SidebarContent (inner, shared between mobile + desktop)
// ---------------------------------------------------------------------------

function SidebarContent({
  pathname,
  user,
  workspaces,
  onNavigate,
}: {
  pathname: string;
  user: SidebarUser;
  workspaces: SidebarWorkspace[];
  onNavigate?: () => void;
}) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // signOut redirects, which throws NEXT_REDIRECT. Ignore.
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo + Workspace */}
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          N
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-lg font-bold leading-tight text-gray-900">
            NipoAI
          </span>
          {workspaces.length > 0 && (
            <span className="truncate text-xs text-gray-500">
              {workspaces[0].name}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.displayName || user.email} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {user.displayName || "ユーザー"}
            </p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="ログアウト"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legal links */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">利用規約</a>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">プライバシー</a>
          <a href="/legal" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">特商法表記</a>
          <a href="/contact" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">お問い合わせ</a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar (main export)
// ---------------------------------------------------------------------------

function Sidebar({ user, workspaces }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="fixed left-4 top-4 z-40 rounded-lg border border-gray-200 bg-white p-2 shadow-sm lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          className="absolute right-3 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onClick={() => setMobileOpen(false)}
          aria-label="メニューを閉じる"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent
          pathname={pathname}
          user={user}
          workspaces={workspaces}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 lg:border-r lg:border-gray-200 lg:bg-white">
        <SidebarContent
          pathname={pathname}
          user={user}
          workspaces={workspaces}
        />
      </aside>
    </>
  );
}

export { Sidebar };
