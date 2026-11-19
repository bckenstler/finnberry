"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import type { UserDecision } from "@finnberry/schemas";

const statusLabels = {
  PENDING: "Waiting for approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

// Accounts that need a decision come first.
const statusOrder = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as const;

export default function AdminAccountsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: users, isLoading, error } = trpc.admin.listUsers.useQuery();

  const setUserStatus = trpc.admin.setUserStatus.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
    onError: (mutationError) => {
      toast({
        title: "Error",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const decide = (userId: string, status: UserDecision) =>
    setUserStatus.mutate({ userId, status });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading accounts...</p>;
  }

  if (error || !users) {
    return (
      <p className="text-muted-foreground">
        Only the administrator of this instance can manage accounts.
      </p>
    );
  }

  const sortedUsers = [...users].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            Anyone can sign in, but an account can use Finnberry only after you
            approve it. Rejecting an account also signs it out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback>
                      {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {user.name || user.email}
                      </span>
                      {user.isAdmin && (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground block truncate">
                      {user.name ? `${user.email} · ` : ""}
                      {user.isAdmin ? "Administrator" : statusLabels[user.status]}
                    </span>
                  </div>
                </div>

                {!user.isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    {user.status !== "APPROVED" && (
                      <Button
                        size="sm"
                        disabled={setUserStatus.isPending}
                        onClick={() => decide(user.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                    )}
                    {user.status !== "REJECTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setUserStatus.isPending}
                        onClick={() => decide(user.id, "REJECTED")}
                      >
                        {user.status === "APPROVED" ? "Revoke" : "Reject"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
