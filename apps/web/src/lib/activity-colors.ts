/**
 * Activity color configuration for the dashboard cards and timeline
 * Each activity type has a background color and text color for proper contrast
 */

export type ActivityCategory =
  | "sleep"
  | "nursing"
  | "bottle"
  | "solids"
  | "diaper";

export interface ActivityColorConfig {
  bg: string;
  bgDark: string;
  text: string;
  textDark: string;
  border: string;
  borderDark: string;
  icon: string;
  iconDark: string;
}

export const activityColors: Record<ActivityCategory, ActivityColorConfig> = {
  sleep: {
    bg: "bg-cyan-500",
    bgDark: "dark:bg-cyan-600",
    text: "text-white",
    textDark: "dark:text-white",
    border: "border-cyan-600",
    borderDark: "dark:border-cyan-500",
    icon: "text-cyan-600",
    iconDark: "dark:text-cyan-400",
  },
  nursing: {
    bg: "bg-orange-400",
    bgDark: "dark:bg-orange-500",
    text: "text-white",
    textDark: "dark:text-white",
    border: "border-orange-500",
    borderDark: "dark:border-orange-400",
    icon: "text-orange-500",
    iconDark: "dark:text-orange-400",
  },
  bottle: {
    bg: "bg-orange-500",
    bgDark: "dark:bg-orange-600",
    text: "text-white",
    textDark: "dark:text-white",
    border: "border-orange-600",
    borderDark: "dark:border-orange-500",
    icon: "text-orange-600",
    iconDark: "dark:text-orange-400",
  },
  solids: {
    bg: "bg-rose-400",
    bgDark: "dark:bg-rose-500",
    text: "text-white",
    textDark: "dark:text-white",
    border: "border-rose-500",
    borderDark: "dark:border-rose-400",
    icon: "text-rose-500",
    iconDark: "dark:text-rose-400",
  },
  diaper: {
    bg: "bg-yellow-400",
    bgDark: "dark:bg-yellow-500",
    text: "text-yellow-900",
    textDark: "dark:text-yellow-900",
    border: "border-yellow-500",
    borderDark: "dark:border-yellow-400",
    icon: "text-yellow-600",
    iconDark: "dark:text-yellow-400",
  },
};

/**
 * Get Tailwind classes for an activity card background
 */
export function getActivityCardClasses(category: ActivityCategory): string {
  const colors = activityColors[category];
  return `${colors.bg} ${colors.bgDark} ${colors.text} ${colors.textDark}`;
}

/**
 * Get Tailwind classes for an activity timeline bar
 */
export function getActivityBarClasses(category: ActivityCategory): string {
  const colors = activityColors[category];
  return `${colors.bg} ${colors.bgDark}`;
}

/**
 * Get Tailwind classes for an activity icon
 */
export function getActivityIconClasses(category: ActivityCategory): string {
  const colors = activityColors[category];
  return `${colors.icon} ${colors.iconDark}`;
}

/**
 * Map feeding types to activity categories
 */
export function feedingTypeToCategory(
  feedingType: "BREAST" | "BOTTLE" | "SOLIDS"
): ActivityCategory {
  switch (feedingType) {
    case "BREAST":
      return "nursing";
    case "BOTTLE":
      return "bottle";
    case "SOLIDS":
      return "solids";
  }
}
