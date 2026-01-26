"use client";

import { useState } from "react";
import {
  getActivityCardClasses,
  type ActivityCategory,
} from "@/lib/activity-colors";
import { TimeSince } from "@/components/ui/time-since";
import { LogModal } from "@/components/tracking/log-modal";
import { formatDurationPrecise } from "@finnberry/utils";
import { Moon, Baby, Milk, Utensils, Droplets } from "lucide-react";

interface ActivityCardProps {
  category: ActivityCategory;
  childId: string;
  lastTime: Date | null;
  details?: string;
  isActive?: boolean;
  activeLabel?: string;
}

const categoryConfig: Record<
  ActivityCategory,
  {
    icon: typeof Moon;
    label: string;
    logType: "sleep" | "breast" | "bottle" | "diaper";
  }
> = {
  sleep: { icon: Moon, label: "Sleep", logType: "sleep" },
  nursing: { icon: Baby, label: "Nursing", logType: "breast" },
  bottle: { icon: Milk, label: "Bottle", logType: "bottle" },
  solids: { icon: Utensils, label: "Solids", logType: "bottle" },
  diaper: { icon: Droplets, label: "Diaper", logType: "diaper" },
};

export function ActivityCard({
  category,
  childId,
  lastTime,
  details,
  isActive,
  activeLabel,
}: ActivityCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`relative w-full min-h-[100px] p-3 md:p-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] touch-manipulation ${getActivityCardClasses(category)}`}
      >
        {isActive && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {activeLabel || "Active"}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-3">
          <div className="p-2 rounded-lg bg-white/20 w-fit">
            <Icon className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-base md:text-lg">{config.label}</h3>
            <TimeSince
              date={lastTime}
              className="text-xs md:text-sm opacity-90"
              fallback="No records"
            />
            {details && (
              <p className="text-xs md:text-sm mt-1 opacity-80">{details}</p>
            )}
          </div>
        </div>
      </button>

      <LogModal
        childId={childId}
        type={config.logType}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}

/**
 * Format sleep details for display
 */
export function formatSleepDetails(
  lastSleep: { startTime: Date; endTime: Date | null; sleepType: string } | null
): string {
  if (!lastSleep || !lastSleep.endTime) return "";
  const duration = formatDurationPrecise(lastSleep.startTime, lastSleep.endTime);
  return duration;
}

/**
 * Format breastfeeding details for display
 */
export function formatNursingDetails(
  lastFeeding: {
    startTime: Date;
    endTime: Date | null;
    side: string | null;
  } | null
): string {
  if (!lastFeeding || !lastFeeding.endTime) return "";
  const duration = formatDurationPrecise(lastFeeding.startTime, lastFeeding.endTime);
  const sideInfo = lastFeeding.side
    ? lastFeeding.side === "LEFT"
      ? "(L)"
      : lastFeeding.side === "RIGHT"
        ? "(R)"
        : "(L+R)"
    : "";
  return `${duration} ${sideInfo}`.trim();
}

/**
 * Format bottle details for display
 */
export function formatBottleDetails(
  lastBottle: {
    amountMl: number | null;
    bottleContentType: string | null;
  } | null
): string {
  if (!lastBottle) return "";
  const amount = lastBottle.amountMl
    ? `${Math.round(lastBottle.amountMl / 29.574)}oz`
    : "";
  const type =
    lastBottle.bottleContentType === "BREAST_MILK"
      ? "Breast Milk"
      : lastBottle.bottleContentType === "FORMULA"
        ? "Formula"
        : "";
  return [amount, type].filter(Boolean).join(" ");
}

/**
 * Format diaper details for display
 */
export function formatDiaperDetails(
  lastDiaper: {
    diaperType: string;
    amount?: string | null;
    color?: string | null;
  } | null
): string {
  if (!lastDiaper) return "";
  const typeLabel =
    lastDiaper.diaperType === "WET"
      ? "Wet"
      : lastDiaper.diaperType === "DIRTY"
        ? "Dirty"
        : lastDiaper.diaperType === "BOTH"
          ? "Mixed"
          : "Dry";
  return typeLabel;
}
