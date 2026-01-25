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
  };
}

interface TimerState {
  timers: Record<string, ActiveTimer>;
  startTimer: (timer: Omit<ActiveTimer, "id">) => string;
  stopTimer: (id: string) => ActiveTimer | undefined;
  updateTimer: (id: string, updates: Partial<ActiveTimer>) => void;
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
        const timer: ActiveTimer = {
          ...timerData,
          id,
          startTime: timerData.startTime || Date.now(),
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

export function useActiveTimer(childId: string, type: TimerType) {
  const timer = useTimerStore((state) => state.getTimerByType(childId, type));
  return timer;
}

export function useElapsedTime(timerId: string | undefined) {
  const getElapsedTime = useTimerStore((state) => state.getElapsedTime);

  if (!timerId) return 0;
  return getElapsedTime(timerId);
}
