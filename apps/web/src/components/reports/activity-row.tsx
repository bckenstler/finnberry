"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getActivityIconClasses,
  feedingTypeToCategory,
  type ActivityCategory,
} from "@/lib/activity-colors";
import {
  formatTimeShort,
  formatTimeRange,
  formatDurationPrecise,
} from "@finnberry/utils";
import { Moon, Baby, Milk, Utensils, Droplets, ChevronRight, Trash2 } from "lucide-react";

interface SleepRecord {
  id: string;
  startTime: Date;
  endTime: Date | null;
  sleepType: string;
  quality?: number | null;
  notes?: string | null;
}

interface FeedingRecord {
  id: string;
  startTime: Date;
  endTime: Date | null;
  feedingType: string;
  side?: string | null;
  amountMl?: number | null;
  bottleContentType?: string | null;
  foodItems?: string[] | null;
  notes?: string | null;
}

interface DiaperRecord {
  id: string;
  time: Date;
  diaperType: string;
  color?: string | null;
  amount?: string | null;
  notes?: string | null;
}

type Activity =
  | { type: "SLEEP"; record: SleepRecord; time: Date }
  | { type: "FEEDING"; record: FeedingRecord; time: Date }
  | { type: "DIAPER"; record: DiaperRecord; time: Date };

interface ActivityRowProps {
  activity: Activity;
  childId: string;
  childName?: string;
}

const iconMap = {
  sleep: Moon,
  nursing: Baby,
  bottle: Milk,
  solids: Utensils,
  diaper: Droplets,
};

export function ActivityRow({ activity, childId, childName = "Baby" }: ActivityRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deleteSleep = trpc.sleep.delete.useMutation({
    onSuccess: () => {
      utils.sleep.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      toast({ title: "Sleep record deleted" });
      setDeleteConfirmOpen(false);
      setEditOpen(false);
    },
  });

  const deleteFeeding = trpc.feeding.delete.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      toast({ title: "Feeding record deleted" });
      setDeleteConfirmOpen(false);
      setEditOpen(false);
    },
  });

  const deleteDiaper = trpc.diaper.delete.useMutation({
    onSuccess: () => {
      utils.diaper.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      toast({ title: "Diaper record deleted" });
      setDeleteConfirmOpen(false);
      setEditOpen(false);
    },
  });

  const handleDelete = () => {
    switch (activity.type) {
      case "SLEEP":
        deleteSleep.mutate({ id: activity.record.id });
        break;
      case "FEEDING":
        deleteFeeding.mutate({ id: activity.record.id });
        break;
      case "DIAPER":
        deleteDiaper.mutate({ id: activity.record.id });
        break;
    }
  };

  const isDeleting =
    deleteSleep.isPending || deleteFeeding.isPending || deleteDiaper.isPending;

  // Determine category and display info
  let category: ActivityCategory;
  let description: string;
  let timeDisplay: string;
  let details: string;

  switch (activity.type) {
    case "SLEEP": {
      category = "sleep";
      const r = activity.record;
      const duration = r.endTime ? formatDurationPrecise(r.startTime, r.endTime) : "";
      description = duration ? `${childName} slept for ${duration}` : `${childName} is sleeping`;
      timeDisplay = r.endTime
        ? formatTimeRange(r.startTime, r.endTime)
        : `${formatTimeShort(r.startTime)} - ongoing`;
      details = r.sleepType === "NIGHT" ? "Night" : "Nap";
      break;
    }
    case "FEEDING": {
      const r = activity.record;
      if (r.feedingType === "BREAST") {
        category = "nursing";
        const duration = r.endTime ? formatDurationPrecise(r.startTime, r.endTime) : "";
        description = duration ? `${childName} was breastfed for ${duration}` : `${childName} is breastfeeding`;
        timeDisplay = r.endTime
          ? formatTimeRange(r.startTime, r.endTime)
          : `${formatTimeShort(r.startTime)} - ongoing`;
        details = r.side === "LEFT" ? "Left" : r.side === "RIGHT" ? "Right" : "Both";
      } else if (r.feedingType === "BOTTLE") {
        category = "bottle";
        const amount = r.amountMl
          ? `${Math.round(r.amountMl / 29.574)}oz`
          : "";
        const contentType =
          r.bottleContentType === "BREAST_MILK" ? "breast milk" : "formula";
        description = `${childName} had a ${amount} bottle of ${contentType}`;
        timeDisplay = formatTimeShort(r.startTime);
        details = "";
      } else {
        category = "solids";
        const foods = r.foodItems?.join(", ") || "solids";
        description = `${childName} ate ${foods}`;
        timeDisplay = formatTimeShort(r.startTime);
        details = "";
      }
      break;
    }
    case "DIAPER": {
      category = "diaper";
      const r = activity.record;
      if (r.diaperType === "WET") {
        description = `${childName} had pee 💧`;
      } else if (r.diaperType === "DIRTY") {
        description = `${childName} had poo 💩`;
      } else if (r.diaperType === "BOTH") {
        description = `${childName} had poo and pee 💧💩`;
      } else {
        description = `${childName} had a dry diaper`;
      }
      timeDisplay = formatTimeShort(r.time);
      details = r.amount ? (r.amount === "SMALL" ? "S" : r.amount === "MEDIUM" ? "M" : "L") : "";
      break;
    }
  }

  const Icon = iconMap[category];
  const iconClasses = getActivityIconClasses(category);

  return (
    <>
      <button
        onClick={() => setEditOpen(true)}
        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
      >
        <div className={`${iconClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{description}</p>
          <p className="text-xs text-muted-foreground">{timeDisplay}</p>
        </div>
        {details && (
          <span className="text-sm text-muted-foreground">{details}</span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Edit/View Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={iconClasses}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">{description}</p>
                <p className="text-sm text-muted-foreground">{timeDisplay}</p>
                {details && <p className="text-sm">{details}</p>}
              </div>
            </div>

            {activity.record.notes && (
              <div>
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground">
                  {activity.record.notes}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Activity?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this activity? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
