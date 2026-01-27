"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Plus, Baby, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const { data: households, isLoading } = trpc.household.list.useQuery();

  const household = households?.[0];
  const children = household?.children || [];
  const firstChild = children[0];

  // Auto-redirect to first child's dashboard
  useEffect(() => {
    if (!isLoading && firstChild) {
      router.replace(`/dashboard/${firstChild.id}`);
    }
  }, [isLoading, firstChild, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // No household - show create household
  if (!households?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Home className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Welcome to Finnberry</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Create a household to start tracking your baby&apos;s activities
        </p>
        <Button asChild>
          <Link href="/dashboard/household/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Household
          </Link>
        </Button>
      </div>
    );
  }

  // No children - show add child
  if (!children.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{household?.name}</h1>
          <Button asChild variant="outline">
            <Link href="/dashboard/household/settings">Settings</Link>
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
          <Baby className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Add your first child</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Add a child to start tracking their sleep, feeding, and diaper changes
          </p>
          <Button asChild>
            <Link href={`/dashboard/${household?.id}/child/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Has children - show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}
