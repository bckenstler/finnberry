"use client";

import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  elapsedMs: number;
  className?: string;
  size?: "default" | "large";
}

export function TimerDisplay({
  elapsedMs,
  className,
  size = "default",
}: TimerDisplayProps) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          "font-mono tracking-wider",
          size === "large" ? "text-5xl font-bold" : "text-4xl font-semibold"
        )}
      >
        {formattedMinutes}:{formattedSeconds}
      </div>
      <div className="flex gap-8 text-xs text-muted-foreground mt-1">
        <span>MIN</span>
        <span>SEC</span>
      </div>
    </div>
  );
}
