import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTimerStore, formatElapsedTime, type TimerType } from "./timer-store";

describe("timer-store", () => {
  beforeEach(() => {
    useTimerStore.getState().clearAllTimers();
  });

  describe("startTimer", () => {
    it("creates a new timer with unique id", () => {
      const id = useTimerStore.getState().startTimer({
        type: "sleep",
        childId: "child-1",
        startTime: Date.now(),
      });

      expect(id).toContain("sleep-child-1");
      // Get fresh state after mutation
      expect(useTimerStore.getState().timers[id]).toBeDefined();
    });

    it("stores timer with correct properties", () => {
      const startTime = Date.now();

      const id = useTimerStore.getState().startTimer({
        type: "feeding",
        childId: "child-1",
        startTime,
        metadata: { feedingSide: "LEFT" },
      });

      // Get fresh state after mutation
      const timer = useTimerStore.getState().timers[id];
      expect(timer.type).toBe("feeding");
      expect(timer.childId).toBe("child-1");
      expect(timer.startTime).toBe(startTime);
      expect(timer.metadata?.feedingSide).toBe("LEFT");
    });

    it("uses current time if startTime not provided", () => {
      const before = Date.now();

      const id = useTimerStore.getState().startTimer({
        type: "sleep",
        childId: "child-1",
        startTime: 0, // Will be overridden
      });

      const after = Date.now();
      // Get fresh state after mutation
      const timer = useTimerStore.getState().timers[id];
      expect(timer.startTime).toBeGreaterThanOrEqual(before);
      expect(timer.startTime).toBeLessThanOrEqual(after);
    });
  });

  describe("stopTimer", () => {
    it("removes timer and returns it", () => {
      const id = useTimerStore.getState().startTimer({
        type: "sleep",
        childId: "child-1",
        startTime: Date.now(),
      });

      const stoppedTimer = useTimerStore.getState().stopTimer(id);

      expect(stoppedTimer).toBeDefined();
      expect(stoppedTimer?.type).toBe("sleep");
      // Get fresh state after mutation
      expect(useTimerStore.getState().timers[id]).toBeUndefined();
    });

    it("returns undefined for non-existent timer", () => {
      const result = useTimerStore.getState().stopTimer("non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("updateTimer", () => {
    it("updates timer properties", () => {
      const id = useTimerStore.getState().startTimer({
        type: "sleep",
        childId: "child-1",
        startTime: Date.now(),
      });

      useTimerStore.getState().updateTimer(id, { recordId: "record-123" });

      // Get fresh state after mutation
      expect(useTimerStore.getState().timers[id].recordId).toBe("record-123");
    });

    it("does nothing for non-existent timer", () => {
      useTimerStore.getState().updateTimer("non-existent", { recordId: "test" });
      // Should not throw
      expect(useTimerStore.getState().timers["non-existent"]).toBeUndefined();
    });
  });

  describe("getTimersByChild", () => {
    it("returns all timers for a specific child", () => {
      useTimerStore.getState().startTimer({ type: "sleep", childId: "child-1", startTime: Date.now() });
      useTimerStore.getState().startTimer({ type: "feeding", childId: "child-1", startTime: Date.now() });
      useTimerStore.getState().startTimer({ type: "sleep", childId: "child-2", startTime: Date.now() });

      const child1Timers = useTimerStore.getState().getTimersByChild("child-1");
      const child2Timers = useTimerStore.getState().getTimersByChild("child-2");

      expect(child1Timers).toHaveLength(2);
      expect(child2Timers).toHaveLength(1);
    });

    it("returns empty array when no timers exist", () => {
      const timers = useTimerStore.getState().getTimersByChild("child-1");
      expect(timers).toHaveLength(0);
    });
  });

  describe("getTimerByType", () => {
    it("returns timer for specific child and type", () => {
      useTimerStore.getState().startTimer({ type: "sleep", childId: "child-1", startTime: Date.now() });
      useTimerStore.getState().startTimer({ type: "feeding", childId: "child-1", startTime: Date.now() });

      const sleepTimer = useTimerStore.getState().getTimerByType("child-1", "sleep");
      const feedingTimer = useTimerStore.getState().getTimerByType("child-1", "feeding");

      expect(sleepTimer?.type).toBe("sleep");
      expect(feedingTimer?.type).toBe("feeding");
    });

    it("returns undefined when no matching timer", () => {
      const timer = useTimerStore.getState().getTimerByType("child-1", "sleep");
      expect(timer).toBeUndefined();
    });
  });

  describe("getElapsedTime", () => {
    it("calculates elapsed time correctly", () => {
      const startTime = Date.now() - 60000; // 1 minute ago

      const id = useTimerStore.getState().startTimer({
        type: "sleep",
        childId: "child-1",
        startTime,
      });

      const elapsed = useTimerStore.getState().getElapsedTime(id);
      expect(elapsed).toBeGreaterThanOrEqual(60000);
      expect(elapsed).toBeLessThan(61000);
    });

    it("returns 0 for non-existent timer", () => {
      const elapsed = useTimerStore.getState().getElapsedTime("non-existent");
      expect(elapsed).toBe(0);
    });
  });

  describe("clearAllTimers", () => {
    it("removes all timers", () => {
      useTimerStore.getState().startTimer({ type: "sleep", childId: "child-1", startTime: Date.now() });
      useTimerStore.getState().startTimer({ type: "feeding", childId: "child-2", startTime: Date.now() });

      useTimerStore.getState().clearAllTimers();

      // Get fresh state after mutation
      expect(Object.keys(useTimerStore.getState().timers)).toHaveLength(0);
    });
  });
});

describe("formatElapsedTime", () => {
  it("formats seconds correctly", () => {
    expect(formatElapsedTime(30000)).toBe("0:30");
    expect(formatElapsedTime(45000)).toBe("0:45");
  });

  it("formats minutes correctly", () => {
    expect(formatElapsedTime(60000)).toBe("1:00");
    expect(formatElapsedTime(90000)).toBe("1:30");
    expect(formatElapsedTime(600000)).toBe("10:00");
  });

  it("formats hours correctly", () => {
    expect(formatElapsedTime(3600000)).toBe("1:00:00");
    expect(formatElapsedTime(3660000)).toBe("1:01:00");
    expect(formatElapsedTime(3661000)).toBe("1:01:01");
  });

  it("pads single digit values", () => {
    expect(formatElapsedTime(65000)).toBe("1:05");
    expect(formatElapsedTime(3605000)).toBe("1:00:05");
  });

  it("handles zero", () => {
    expect(formatElapsedTime(0)).toBe("0:00");
  });
});
