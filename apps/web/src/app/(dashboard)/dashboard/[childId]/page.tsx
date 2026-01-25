"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/provider";
import { QuickLogGrid } from "@/components/tracking/quick-log-grid";
import { ActiveTimers } from "@/components/tracking/active-timers";
import { RecentActivity } from "@/components/tracking/recent-activity";
import { DailySummary } from "@/components/tracking/daily-summary";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

export default function ChildDashboardPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const { data: child, isLoading } = trpc.child.get.useQuery({ id: childId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">Child not found</p>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{child.name}</h1>
            <p className="text-sm text-muted-foreground">
              Born {new Date(child.birthDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/${childId}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>

      <ActiveTimers childId={childId} />

      <QuickLogGrid childId={childId} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DailySummary childId={childId} />
        <RecentActivity childId={childId} />
      </div>
    </div>
  );
}
