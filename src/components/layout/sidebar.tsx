"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  ClipboardCheck,
  Settings,
  List,
  Users,
  History,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
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
  {
    title: "Approvals",
    href: "/approvals",
    icon: ClipboardCheck,
  },
];

const adminNavItems = [
  {
    title: "Dropdown Lists",
    href: "/admin/dropdowns",
    icon: List,
  },
  {
    title: "Approvers",
    href: "/admin/approvers",
    icon: Users,
  },
  {
    title: "Audit Log",
    href: "/admin/audit-log",
    icon: History,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-sidebar-foreground">
            PAR System
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Main
        </div>
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href) && item.href !== "/requests/new" && item.href !== "/requests") ||
            (item.href === "/requests" && pathname === "/requests") ||
            (item.href === "/requests/new" && pathname === "/requests/new");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}

        <Separator className="my-4" />

        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Settings className="mr-1 inline h-3 w-3" />
          Administration
        </div>
        {adminNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Position Authorization Request
        </p>
        <p className="text-xs text-muted-foreground">
          Caesar Rodney School District
        </p>
      </div>
    </div>
  );
}
