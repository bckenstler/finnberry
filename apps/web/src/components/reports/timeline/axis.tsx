"use client";

import { getTimelineHourLabels, DAY_START_HOUR } from "@finnberry/utils";

export function TimelineAxis() {
  const labels = getTimelineHourLabels(DAY_START_HOUR);

  return (
    <div className="flex justify-between text-xs text-muted-foreground mb-2 ml-12">
      {labels.map((label, i) => (
        <span key={`${label}-${i}`} className="w-0 text-center">
          {label}
        </span>
      ))}
    </div>
  );
}
