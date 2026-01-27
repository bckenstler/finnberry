import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TimerType = "sleep" | "feeding" | "pumping" | "activity";

export interface ActiveTimer {
  id: string;
  type: TimerType;
  childId: string;
  recordId?: string;
  startTime: number;
  metadata?: {
    sleepType?: "NAP" | "NIGHT";
    feedingSide?: "LEFT" | "RIGHT" | "BOTH";
    activityType?: string;
    pumpingSide?: "LEFT" | "RIGHT" | "BOTH";
    // Per-side breastfeeding tracking
    leftAccumulatedMs?: number;   // Total ms on LEFT before current segment
    rightAccumulatedMs?: number;  // Total ms on RIGHT before current segment
    currentSideStartTime?: number; // When current side segment started
  };
}

interface TimerState {
  timers: Record<string, ActiveTimer>;
  startTimer: (timer: Omit<ActiveTimer, "id">) => string;
  stopTimer: (id: string) => ActiveTimer | undefined;
  updateTimer: (id: string, updates: Partial<ActiveTimer>) => void;
  switchBreastfeedingSide: (id: string, newSide: "LEFT" | "RIGHT") => void;
  getTimersByChild: (childId: string) => ActiveTimer[];
  getTimerByType: (childId: string, type: TimerType) => ActiveTimer | undefined;
  getElapsedTime: (id: string) => number;
  clearAllTimers: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      timers: {},

      startTimer: (timerData) => {
        const id = `${timerData.type}-${timerData.childId}-${Date.now()}`;
        const now = timerData.startTime || Date.now();

        // For feeding timers with a side, initialize per-side tracking
        const metadata = timerData.metadata;
        const enhancedMetadata = timerData.type === "feeding" && metadata?.feedingSide
          ? {
              ...metadata,
              leftAccumulatedMs: 0,
              rightAccumulatedMs: 0,
              currentSideStartTime: now,
            }
          : metadata;

        const timer: ActiveTimer = {
          ...timerData,
          id,
          startTime: now,
          metadata: enhancedMetadata,
        };

        set((state) => ({
          timers: {
            ...state.timers,
            [id]: timer,
          },
        }));

        return id;
      },

      stopTimer: (id) => {
        const timer = get().timers[id];
        if (!timer) return undefined;

        set((state) => {
          const { [id]: _, ...rest } = state.timers;
          return { timers: rest };
        });

        return timer;
      },

      updateTimer: (id, updates) => {
        set((state) => {
          const timer = state.timers[id];
          if (!timer) return state;

          return {
            timers: {
              ...state.timers,
              [id]: { ...timer, ...updates },
            },
          };
        });
      },

      switchBreastfeedingSide: (id, newSide) => {
        set((state) => {
          const timer = state.timers[id];
          if (!timer || timer.type !== "feeding") return state;

          const now = Date.now();
          const currentSide = timer.metadata?.feedingSide;
          const currentSideStartTime = timer.metadata?.currentSideStartTime ?? timer.startTime;
          const elapsedOnCurrentSide = now - currentSideStartTime;

          // Calculate new accumulated times
          let leftAccumulated = timer.metadata?.leftAccumulatedMs ?? 0;
          let rightAccumulated = timer.metadata?.rightAccumulatedMs ?? 0;

          if (currentSide === "LEFT") {
            leftAccumulated += elapsedOnCurrentSide;
          } else if (currentSide === "RIGHT") {
            rightAccumulated += elapsedOnCurrentSide;
          }

          return {
            timers: {
              ...state.timers,
              [id]: {
                ...timer,
                metadata: {
                  ...timer.metadata,
                  feedingSide: newSide,
                  leftAccumulatedMs: leftAccumulated,
                  rightAccumulatedMs: rightAccumulated,
                  currentSideStartTime: now,
                },
              },
            },
          };
        });
      },

      getTimersByChild: (childId) => {
        return Object.values(get().timers).filter((t) => t.childId === childId);
      },

      getTimerByType: (childId, type) => {
        return Object.values(get().timers).find(
          (t) => t.childId === childId && t.type === type
        );
      },

      getElapsedTime: (id) => {
        const timer = get().timers[id];
        if (!timer) return 0;
        return Date.now() - timer.startTime;
      },

      clearAllTimers: () => {
        set({ timers: {} });
      },
    }),
    {
      name: "finnberry-timers",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

// Helper functions for per-side breastfeeding tracking
export function getLeftElapsedMs(timer: ActiveTimer | undefined): number {
  if (!timer) return 0;
  const accumulated = timer.metadata?.leftAccumulatedMs ?? 0;
  if (timer.metadata?.feedingSide === "LEFT" && timer.metadata?.currentSideStartTime) {
    return accumulated + (Date.now() - timer.metadata.currentSideStartTime);
  }
  return accumulated;
}

export function getRightElapsedMs(timer: ActiveTimer | undefined): number {
  if (!timer) return 0;
  const accumulated = timer.metadata?.rightAccumulatedMs ?? 0;
  if (timer.metadata?.feedingSide === "RIGHT" && timer.metadata?.currentSideStartTime) {
    return accumulated + (Date.now() - timer.metadata.currentSideStartTime);
  }
  return accumulated;
}

export function getTotalBreastfeedingElapsedMs(timer: ActiveTimer | undefined): number {
  if (!timer) return 0;
  return getLeftElapsedMs(timer) + getRightElapsedMs(timer);
}

export function useActiveTimer(childId: string, type: TimerType) {
  const timer = useTimerStore((state) => state.getTimerByType(childId, type));
  return timer;
}

export function useElapsedTime(timerId: string | undefined) {
  const getElapsedTime = useTimerStore((state) => state.getElapsedTime);

  if (!timerId) return 0;
  return getElapsedTime(timerId);
}
