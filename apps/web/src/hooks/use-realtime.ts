"use client";

import { useEffect } from "react";
import { supabase, type RealtimePayload } from "@/lib/supabase";
import { trpc } from "@/lib/trpc/provider";

type TableName =
  | "sleep_records"
  | "feeding_records"
  | "diaper_records"
  | "pumping_records"
  | "activity_records"
  | "children";

export function useRealtimeSync(childId: string) {
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!childId) return;

    const channel = supabase
      .channel(`child-${childId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sleep_records",
          filter: `child_id=eq.${childId}`,
        },
        () => {
          utils.sleep.list.invalidate({ childId });
          utils.sleep.summary.invalidate({ childId });
          utils.sleep.getActive.invalidate({ childId });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feeding_records",
          filter: `child_id=eq.${childId}`,
        },
        () => {
          utils.feeding.list.invalidate({ childId });
          utils.feeding.summary.invalidate({ childId });
          utils.feeding.getActive.invalidate({ childId });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "diaper_records",
          filter: `child_id=eq.${childId}`,
        },
        () => {
          utils.diaper.list.invalidate({ childId });
          utils.diaper.summary.invalidate({ childId });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, utils]);
}

export function useHouseholdRealtimeSync(householdId: string) {
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`household-${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "children",
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          utils.child.list.invalidate({ householdId });
          utils.household.list.invalidate();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "household_members",
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          utils.household.get.invalidate({ id: householdId });
          utils.household.list.invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, utils]);
}
