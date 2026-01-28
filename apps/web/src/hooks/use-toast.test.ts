import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reducer } from "./use-toast";

describe("use-toast reducer", () => {
  describe("ADD_TOAST", () => {
    it("adds a toast to empty state", () => {
      const state = { toasts: [] };
      const toast = { id: "1", title: "Test", open: true };

      const result = reducer(state, {
        type: "ADD_TOAST",
        toast,
      });

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0]).toEqual(toast);
    });

    it("prepends new toast to existing toasts", () => {
      const existingToast = { id: "1", title: "First", open: true };
      const state = { toasts: [existingToast] };
      const newToast = { id: "2", title: "Second", open: true };

      const result = reducer(state, {
        type: "ADD_TOAST",
        toast: newToast,
      });

      expect(result.toasts).toHaveLength(1); // Limited to TOAST_LIMIT (1)
      expect(result.toasts[0]?.id).toBe("2"); // Newest first
    });

    it("limits toasts to TOAST_LIMIT", () => {
      const state = { toasts: [] };

      // Add multiple toasts
      let currentState = state;
      for (let i = 0; i < 5; i++) {
        currentState = reducer(currentState, {
          type: "ADD_TOAST",
          toast: { id: `${i}`, title: `Toast ${i}`, open: true },
        });
      }

      expect(currentState.toasts).toHaveLength(1); // TOAST_LIMIT is 1
    });
  });

  describe("UPDATE_TOAST", () => {
    it("updates existing toast by id", () => {
      const state = {
        toasts: [
          { id: "1", title: "Original", open: true },
        ],
      };

      const result = reducer(state, {
        type: "UPDATE_TOAST",
        toast: { id: "1", title: "Updated" },
      });

      expect(result.toasts[0]?.title).toBe("Updated");
      expect(result.toasts[0]?.open).toBe(true); // Preserves other properties
    });

    it("does not affect other toasts", () => {
      const state = {
        toasts: [
          { id: "1", title: "First", open: true },
          { id: "2", title: "Second", open: true },
        ],
      };

      const result = reducer(state, {
        type: "UPDATE_TOAST",
        toast: { id: "1", title: "Updated" },
      });

      expect(result.toasts[1]?.title).toBe("Second");
    });

    it("does nothing when toast id not found", () => {
      const state = {
        toasts: [
          { id: "1", title: "First", open: true },
        ],
      };

      const result = reducer(state, {
        type: "UPDATE_TOAST",
        toast: { id: "999", title: "Updated" },
      });

      expect(result.toasts).toEqual(state.toasts);
    });
  });

  describe("DISMISS_TOAST", () => {
    it("sets open to false for specific toast", () => {
      const state = {
        toasts: [
          { id: "1", title: "Test", open: true },
        ],
      };

      const result = reducer(state, {
        type: "DISMISS_TOAST",
        toastId: "1",
      });

      expect(result.toasts[0]?.open).toBe(false);
    });

    it("dismisses all toasts when no toastId provided", () => {
      const state = {
        toasts: [
          { id: "1", title: "First", open: true },
          { id: "2", title: "Second", open: true },
        ],
      };

      const result = reducer(state, {
        type: "DISMISS_TOAST",
        toastId: undefined,
      });

      expect(result.toasts.every((t) => t.open === false)).toBe(true);
    });

    it("only dismisses matching toast id", () => {
      const state = {
        toasts: [
          { id: "1", title: "First", open: true },
          { id: "2", title: "Second", open: true },
        ],
      };

      const result = reducer(state, {
        type: "DISMISS_TOAST",
        toastId: "1",
      });

      expect(result.toasts[0]?.open).toBe(false);
      expect(result.toasts[1]?.open).toBe(true);
    });
  });

  describe("REMOVE_TOAST", () => {
    it("removes specific toast by id", () => {
      const state = {
        toasts: [
          { id: "1", title: "First", open: true },
          { id: "2", title: "Second", open: true },
        ],
      };

      const result = reducer(state, {
        type: "REMOVE_TOAST",
        toastId: "1",
      });

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0]?.id).toBe("2");
    });

    it("removes all toasts when toastId is undefined", () => {
      const state = {
        toasts: [
          { id: "1", title: "First", open: true },
          { id: "2", title: "Second", open: true },
        ],
      };

      const result = reducer(state, {
        type: "REMOVE_TOAST",
        toastId: undefined,
      });

      expect(result.toasts).toHaveLength(0);
    });

    it("does nothing when toast id not found", () => {
      const state = {
        toasts: [
          { id: "1", title: "First", open: true },
        ],
      };

      const result = reducer(state, {
        type: "REMOVE_TOAST",
        toastId: "999",
      });

      expect(result.toasts).toHaveLength(1);
    });
  });
});
