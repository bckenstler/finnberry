"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { ActiveTimers } from "@/components/tracking/active-timers";
import { LogModal } from "@/components/tracking/log-modal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Moon, Baby, Droplets, ChevronRight } from "lucide-react";

type LogType = "sleep" | "breast" | "bottle" | "diaper";

export default function LogPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const { data: child, isLoading } = trpc.child.get.useQuery({ id: childId });

  const [modalType, setModalType] = useState<LogType | null>(null);

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

  const logOptions = [
    {
      type: "sleep" as const,
      label: "Sleep",
      description: "Log nap or night sleep",
      icon: Moon,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
      textColor: "text-indigo-900 dark:text-indigo-100",
      descColor: "text-indigo-700 dark:text-indigo-300",
    },
    {
      type: "breast" as const,
      label: "Breastfeeding",
      description: "Log breastfeeding session",
      icon: Baby,
      iconColor: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/50",
      textColor: "text-pink-900 dark:text-pink-100",
      descColor: "text-pink-700 dark:text-pink-300",
    },
    {
      type: "bottle" as const,
      label: "Bottle",
      description: "Log bottle feeding",
      icon: Baby,
      iconColor: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/50",
      textColor: "text-orange-900 dark:text-orange-100",
      descColor: "text-orange-700 dark:text-orange-300",
    },
    {
      type: "diaper" as const,
      label: "Diaper",
      description: "Log diaper change",
      icon: Droplets,
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/50",
      textColor: "text-blue-900 dark:text-blue-100",
      descColor: "text-blue-700 dark:text-blue-300",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/${childId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Log Activity</h1>
          <p className="text-sm text-muted-foreground">{child.name}</p>
        </div>
      </div>

      <ActiveTimers childId={childId} />

      <div className="space-y-3">
        {logOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => setModalType(option.type)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl ${option.bgColor} hover:opacity-90 transition-opacity text-left border border-transparent dark:border-white/10`}
          >
            <option.icon className={`h-8 w-8 ${option.iconColor}`} />
            <div className="flex-1">
              <p className={`font-semibold ${option.textColor}`}>{option.label}</p>
              <p className={`text-sm ${option.descColor}`}>{option.description}</p>
            </div>
            <ChevronRight className={`h-5 w-5 ${option.iconColor}`} />
          </button>
        ))}
      </div>

      {modalType && (
        <LogModal
          childId={childId}
          type={modalType}
          open={!!modalType}
          onOpenChange={(open) => !open && setModalType(null)}
        />
      )}
    </div>
  );
}
