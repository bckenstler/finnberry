"use client";

import { useEffect, useState } from "react";
import { formatTimeSince } from "@finnberry/utils";

interface TimeSinceProps {
  date: Date | string | null;
  className?: string;
  /** Refresh interval in milliseconds. Default is 60000 (1 minute) */
  refreshInterval?: number;
  /** Fallback text when date is null */
  fallback?: string;
}

/**
 * Displays "time since" a date with auto-refresh
 * Updates every minute by default to show live time elapsed
 */
export function TimeSince({
  date,
  className,
  refreshInterval = 60000,
  fallback = "Never",
}: TimeSinceProps) {
  const [, setTick] = useState(0);

  // Force re-render on interval to update the time display
  useEffect(() => {
    if (!date) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [date, refreshInterval]);

  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  return <span className={className}>{formatTimeSince(date)}</span>;
}
