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
  Shield,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth/actions";
import { useTheme } from "@/components/theme-provider";

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

const SUPER_ADMIN_EMAILS = ["cafiyagi@gmail.com"];

const navItems: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard", icon: Home },
  { label: "日報一覧", href: "/dashboard/reports", icon: FileText },
  { label: "チーム", href: "/dashboard/team", icon: Users },
  { label: "設定", href: "/dashboard/settings", icon: Settings },
];

const adminNavItem: NavItem = {
  label: "管理者",
  href: "/dashboard/admin",
  icon: Shield,
};

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
  const { theme, toggleTheme } = useTheme();

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
          <span className="text-lg font-bold leading-tight text-[var(--text-primary)]">
            NipoAI
          </span>
          {workspaces.length > 0 && (
            <span className="truncate text-xs text-[var(--text-muted)]">
              {workspaces[0].name}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {[...navItems, ...(SUPER_ADMIN_EMAILS.includes(user.email) ? [adminNavItem] : [])].map((item) => {
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
                      ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
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
      <div className="border-t border-[var(--border-primary)] p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.displayName || user.email} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {user.displayName || "ユーザー"}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
            title={theme === "dark" ? "ライトモード" : "ダークモード"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] disabled:opacity-50"
            aria-label="ログアウト"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legal links */}
      <div className="border-t border-[var(--border-primary)] px-4 py-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">利用規約</a>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">プライバシー</a>
          <a href="/legal" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">特商法表記</a>
          <a href="/contact" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">お問い合わせ</a>
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
        className="fixed left-4 top-3.5 z-40 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-2 shadow-sm lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5 text-[var(--text-secondary)]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: "var(--overlay)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[var(--border-primary)] bg-[var(--bg-card)] transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          className="absolute right-3 top-4 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
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
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 lg:border-r lg:border-[var(--border-primary)] lg:bg-[var(--bg-card)]">
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
