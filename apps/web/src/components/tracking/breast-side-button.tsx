"use client";

import { cn } from "@/lib/utils";
import { formatElapsedTime } from "@/stores/timer-store";

interface BreastSideButtonProps {
  side: "LEFT" | "RIGHT";
  isActive: boolean;
  isLastSide: boolean;
  elapsedMs?: number;
  onClick: () => void;
  disabled?: boolean;
}

export function BreastSideButton({
  side,
  isActive,
  isLastSide,
  elapsedMs = 0,
  onClick,
  disabled = false,
}: BreastSideButtonProps) {
  // Visual representation of breast with nipple pointing inward
  const isLeft = side === "LEFT";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-center w-32 h-32 rounded-full transition-all",
        isActive
          ? "bg-primary text-primary-foreground shadow-lg"
          : "bg-primary/20 border-2 border-dashed border-primary hover:bg-primary/30",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Timer display or breast icon */}
      <div className="relative mb-1">
        {isActive || elapsedMs > 0 ? (
          // Show elapsed time when active OR when there's accumulated time
          <span className={cn(
            "text-xl font-mono font-semibold",
            isActive ? "text-primary-foreground" : "text-primary"
          )}>
            {formatElapsedTime(elapsedMs)}
          </span>
        ) : (
          // Show breast icon when idle and no time accumulated
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center",
                "border-primary/60"
              )}
            >
              {/* Nipple indicator pointing inward */}
              <div
                className={cn(
                  "w-2 h-2 rounded-full bg-primary/60",
                  isLeft ? "mr-1" : "ml-1"
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dashed line separator (only when idle with no time) */}
      {!isActive && elapsedMs === 0 && (
        <div className="w-12 border-t border-dashed border-primary/60 my-1" />
      )}

      {/* Side label */}
      <span
        className={cn(
          "text-sm font-semibold uppercase",
          isActive ? "text-primary-foreground" : "text-primary"
        )}
      >
        {side}
      </span>

      {/* Last Side badge */}
      {isLastSide && !isActive && (
        <span className="text-[10px] text-primary/70 mt-0.5">Last Side</span>
      )}
    </button>
  );
}
