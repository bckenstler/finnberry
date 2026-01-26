"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeView } from "@/components/dashboard/home-view";
import { ReportsView } from "@/components/dashboard/reports-view";
import Link from "next/link";
import { ArrowLeft, Settings, Home, BarChart3 } from "lucide-react";

export default function ChildDashboardPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const [activeTab, setActiveTab] = useState("home");
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
    <div className="space-y-4">
      {/* Header */}
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

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="home" className="gap-2">
            <Home className="h-4 w-4" />
            Home
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-4">
          <HomeView childId={childId} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ReportsView childId={childId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
