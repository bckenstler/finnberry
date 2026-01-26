"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useTimerStore,
  formatElapsedTime,
  type TimerType,
  type ActiveTimer,
} from "@/stores/timer-store";

export function useTimer(childId: string, type: TimerType) {
  const {
    getTimerByType,
    startTimer,
    stopTimer,
    updateTimer,
    getElapsedTime,
  } = useTimerStore();

  const [elapsedMs, setElapsedMs] = useState(0);

  const activeTimer = getTimerByType(childId, type);

  useEffect(() => {
    if (!activeTimer) {
      setElapsedMs(0);
      return;
    }

    const updateElapsed = () => {
      setElapsedMs(getElapsedTime(activeTimer.id));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, getElapsedTime]);

  const start = useCallback(
    (metadata?: ActiveTimer["metadata"]) => {
      return startTimer({
        type,
        childId,
        startTime: Date.now(),
        metadata,
      });
    },
    [startTimer, type, childId]
  );

  const stop = useCallback(() => {
    if (!activeTimer) return undefined;
    return stopTimer(activeTimer.id);
  }, [stopTimer, activeTimer]);

  const update = useCallback(
    (updates: Partial<ActiveTimer>) => {
      // Get current timer from store (not stale closure)
      const currentTimer = getTimerByType(childId, type);
      if (!currentTimer) return;
      updateTimer(currentTimer.id, updates);
    },
    [updateTimer, getTimerByType, childId, type]
  );

  return {
    isRunning: !!activeTimer,
    timer: activeTimer,
    elapsedMs,
    elapsedFormatted: formatElapsedTime(elapsedMs),
    start,
    stop,
    update,
  };
}

export function useAllTimers(childId: string) {
  const getTimersByChild = useTimerStore((state) => state.getTimersByChild);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);

  useEffect(() => {
    const updateTimers = () => {
      setTimers(getTimersByChild(childId));
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);

    return () => clearInterval(interval);
  }, [childId, getTimersByChild]);

  return timers;
}
