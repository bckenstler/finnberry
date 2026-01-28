"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/chat";
import { useChat } from "@/hooks/use-chat";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const { toast } = useToast();

  const { data: child, isLoading: childLoading } = trpc.child.get.useQuery({
    id: childId,
  });

  const { messages, isLoading, sendMessage, stop, clearMessages } = useChat({
    childId,
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (childLoading) {
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={`/dashboard/${childId}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Chat with Finnberry</h1>
            <p className="text-sm text-muted-foreground">
              Tracking for {child.name}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearMessages}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Chat interface */}
      <ChatInterface
        messages={messages}
        onSendMessage={sendMessage}
        onStop={stop}
        isLoading={isLoading}
        className="flex-1 min-h-0 pt-4"
      />
    </div>
  );
}
