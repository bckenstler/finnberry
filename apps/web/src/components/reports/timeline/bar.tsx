"use client";

import {
  getActivityBarClasses,
  type ActivityCategory,
} from "@/lib/activity-colors";

interface TimelineBarProps {
  category: ActivityCategory;
  left: number;
  width: number;
  label?: string;
}

export function TimelineBar({ category, left, width, label }: TimelineBarProps) {
  return (
    <div
      className={`absolute top-1 bottom-1 rounded-sm flex items-center justify-center overflow-hidden ${getActivityBarClasses(category)}`}
      style={{
        left: `${Math.max(0, left)}%`,
        width: `${Math.max(1, Math.min(width, 100 - left))}%`,
      }}
    >
      {label && width > 3 && (
        <span className="text-[10px] font-medium truncate px-0.5">{label}</span>
      )}
    </div>
  );
}
