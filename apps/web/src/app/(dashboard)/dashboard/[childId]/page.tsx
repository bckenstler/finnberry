"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeView } from "@/components/dashboard/home-view";
import { ReportsView } from "@/components/dashboard/reports-view";
import { ChildSelector } from "@/components/dashboard/child-selector";
import { ChatInterface } from "@/components/chat";
import { useChat } from "@/hooks/use-chat";
import Link from "next/link";
import { Settings, Home, BarChart3, MessageCircle } from "lucide-react";

export default function ChildDashboardPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const [activeTab, setActiveTab] = useState("home");
  const { data: child, isLoading: childLoading } = trpc.child.get.useQuery({ id: childId });

  // Get all children in household for the selector
  const { data: allChildren, isLoading: childrenLoading } = trpc.child.list.useQuery(
    { householdId: child?.household?.id ?? "" },
    { enabled: !!child?.household?.id }
  );

  const isLoading = childLoading || (child?.household?.id && childrenLoading);

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
        <ChildSelector
          currentChild={child}
          allChildren={allChildren ?? [child]}
          householdId={child.household?.id ?? ""}
        />
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/${childId}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="home" className="gap-2">
            <Home className="h-4 w-4" />
            Home
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-4">
          <HomeView childId={childId} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ReportsView childId={childId} />
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <ChatTab childId={childId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Separate component to avoid running useChat when chat tab is not active
function ChatTab({ childId }: { childId: string }) {
  const { messages, isLoading, model, setModel, sendMessage, stop, clearMessages } = useChat({
    childId,
  });

  return (
    <div className="h-[calc(100vh-220px)] min-h-[400px] border rounded-lg overflow-hidden">
      <ChatInterface
        messages={messages}
        onSendMessage={sendMessage}
        onStop={stop}
        onClear={clearMessages}
        isLoading={isLoading}
        model={model}
        onModelChange={setModel}
      />
    </div>
  );
}
