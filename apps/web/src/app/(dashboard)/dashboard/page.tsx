"use client";

import { trpc } from "@/lib/trpc/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Baby, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: households, isLoading } = trpc.household.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

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

  const household = households[0];
  const children = household.children || [];

  if (!children.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{household.name}</h1>
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
            <Link href={`/dashboard/${household.id}/child/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{household.name}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${household.id}/child/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/household/settings">Settings</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <Link key={child.id} href={`/dashboard/${child.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Baby className="h-5 w-5" />
                  {child.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Born {new Date(child.birthDate).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
