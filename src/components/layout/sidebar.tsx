"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  FileText,
  ClipboardCheck,
  Settings,
  List,
  Users,
  History,
  Plus,
  LogOut,
  Wrench,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/hooks/use-sidebar";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Requests",
    href: "/requests",
    icon: FileText,
  },
  {
    title: "New Request",
    href: "/requests/new",
    icon: Plus,
  },
];

// Approvals item shown separately based on role
const approvalsItem = {
  title: "Approvals",
  href: "/approvals",
  icon: ClipboardCheck,
};

// Admin nav items with role requirements
const adminNavItems = [
  {
    title: "Dropdown Lists",
    href: "/admin/dropdowns",
    icon: List,
    roles: ["ADMIN", "HR"],
  },
  {
    title: "Approvers",
    href: "/admin/approvers",
    icon: Users,
    roles: ["ADMIN", "HR"],
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: UserPlus,
    roles: ["ADMIN", "HR"],
  },
  {
    title: "Audit Log",
    href: "/admin/audit-log",
    icon: History,
    roles: ["ADMIN"],
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Wrench,
    roles: ["ADMIN"],
  },
];

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: { title: string; href: string; icon: React.ComponentType<{ className?: string }> };
  isActive: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "border-l-[3px] border-primary bg-sidebar-accent text-sidebar-accent-foreground"
          : "border-l-[3px] border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.title}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, toggle } = useSidebar();

  // Hide sidebar on auth pages
  if (pathname.startsWith("/auth")) {
    return null;
  }

  const user = session?.user as { name?: string | null; email?: string | null; role?: string } | undefined;
  const userRole = user?.role ?? "USER";
  const canApprove = userRole === "ADMIN" || userRole === "HR" || userRole === "AUTHORIZER";
  const canAdmin = userRole === "ADMIN" || userRole === "HR";
  const userInitial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  // Filter admin items based on user role
  const visibleAdminItems = adminNavItems.filter((item) => item.roles.includes(userRole));
  const roleLabel = USER_ROLE_LABELS[userRole as UserRole] ?? userRole;

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <FileText className="h-6 w-6 shrink-0 text-primary" />
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground truncate">
              PAR System
            </span>
          )}
        </Link>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={toggle}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {!collapsed && (
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main
          </div>
        )}
        {mainNavItems.map((item) => {
          const isActive =
            (item.href === "/" && pathname === "/") ||
            (item.href !== "/" && item.href !== "/requests/new" && item.href !== "/requests" && pathname.startsWith(item.href)) ||
            (item.href === "/requests" && pathname === "/requests") ||
            (item.href === "/requests/new" && pathname === "/requests/new");

          return (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive}
              collapsed={collapsed}
            />
          );
        })}

        {canApprove && (
          <NavLink
            item={approvalsItem}
            isActive={pathname.startsWith("/approvals")}
            collapsed={collapsed}
          />
        )}

        {canAdmin && visibleAdminItems.length > 0 && (
          <>
            <Separator className="my-4" />

            {!collapsed && (
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Settings className="mr-1 inline h-3 w-3" />
                Administration
              </div>
            )}
            {visibleAdminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                />
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t p-3">
        {user && (
          <div className={cn("mb-3 flex items-center", collapsed ? "justify-center" : "justify-between")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {userInitial}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabel}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
        {!collapsed && (
          <p className="text-xs text-muted-foreground">
            Position Authorization Request
          </p>
        )}
      </div>
    </div>
  );
}
