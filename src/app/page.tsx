import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/db/dashboard";
import { Greeting } from "@/components/dashboard/greeting";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  List,
  ClipboardCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const stats = await getDashboardStats();

  const summaryCards = [
    {
      label: "Drafts",
      count: stats.drafts,
      icon: FileText,
      borderColor: "border-l-muted-foreground",
      bgColor: "bg-muted/50",
      iconColor: "text-muted-foreground",
      href: "/requests?status=DRAFT",
    },
    {
      label: "Pending Approval",
      count: stats.pending,
      icon: Clock,
      borderColor: "border-l-amber-500",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      href: "/requests?status=PENDING_APPROVAL",
    },
    {
      label: "Approved (30d)",
      count: stats.approved,
      icon: CheckCircle2,
      borderColor: "border-l-emerald-500",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/requests?status=APPROVED",
    },
    {
      label: "Kicked Back",
      count: stats.kickedBack,
      icon: AlertTriangle,
      borderColor: "border-l-red-500",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
      href: "/requests?status=KICKED_BACK",
    },
  ];

  return (
    <div className="space-y-8">
      <Greeting />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card
              className={`border-l-4 ${card.borderColor} ${card.bgColor} transition-shadow hover:shadow-md cursor-pointer`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold mt-1">{card.count}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.iconColor}`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/requests/new">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/requests">
              <List className="mr-2 h-4 w-4" />
              View All Requests
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/approvals">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Approval Queue
            </Link>
          </Button>
        </div>
      </div>

      {stats.recentActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {stats.recentActivity.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {entry.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {entry.entityType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {entry.changedBy && <span>{entry.changedBy}</span>}
                      <span>
                        {formatDistanceToNow(new Date(entry.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
