"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { TimeRow } from "@/components/ui/time-row";
import { SimpleToggleGroup } from "@/components/ui/simple-toggle-group";
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
  mlToOz,
  ozToMl,
} from "@finnberry/utils";
import { Moon, Baby, Milk, Utensils, Droplets, ChevronRight, Trash2, Cloud, CloudRain, Heart, Pill, Ruler, Thermometer, Star } from "lucide-react";

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
  leftDurationSeconds?: number | null;
  rightDurationSeconds?: number | null;
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

interface PumpingRecord {
  id: string;
  startTime: Date;
  endTime: Date | null;
  amountMl?: number | null;
  notes?: string | null;
}

interface MedicineRecord {
  id: string;
  time: Date;
  amount?: number | null;
  unit?: string | null;
  notes?: string | null;
  medicine: {
    id: string;
    name: string;
    defaultDosage?: string | null;
  };
}

interface GrowthRecord {
  id: string;
  date: Date;
  weightOz?: number | null;
  heightIn?: number | null;
  headCircumferenceCm?: number | null;
  notes?: string | null;
}

interface TemperatureRecord {
  id: string;
  time: Date;
  temperatureCelsius: number;
  notes?: string | null;
}

interface ActivityRecordType {
  id: string;
  activityType: string;
  startTime: Date;
  endTime: Date | null;
  notes?: string | null;
}

type Activity =
  | { type: "SLEEP"; record: SleepRecord; time: Date }
  | { type: "FEEDING"; record: FeedingRecord; time: Date }
  | { type: "DIAPER"; record: DiaperRecord; time: Date }
  | { type: "PUMPING"; record: PumpingRecord; time: Date }
  | { type: "MEDICINE"; record: MedicineRecord; time: Date }
  | { type: "GROWTH"; record: GrowthRecord; time: Date }
  | { type: "TEMPERATURE"; record: TemperatureRecord; time: Date }
  | { type: "ACTIVITY"; record: ActivityRecordType; time: Date };

interface ActivityRowProps {
  activity: Activity;
  childId: string;
  childName?: string;
  autoOpenEdit?: boolean;
  onEditClose?: () => void;
}

const iconMap = {
  sleep: Moon,
  nursing: Baby,
  bottle: Milk,
  solids: Utensils,
  diaper: Droplets,
  pumping: Heart,
  medicine: Pill,
  growth: Ruler,
  temperature: Thermometer,
  activity: Star,
};

type DiaperAmount = "SMALL" | "MEDIUM" | "LARGE";
type DiaperColor = "YELLOW" | "GREEN" | "BROWN" | "BLACK" | "OTHER";

const amountOptions: { value: DiaperAmount; label: string }[] = [
  { value: "SMALL", label: "S" },
  { value: "MEDIUM", label: "M" },
  { value: "LARGE", label: "L" },
];

const colorOptions: { value: DiaperColor; label: string; color: string }[] = [
  { value: "YELLOW", label: "Yellow", color: "bg-yellow-400" },
  { value: "GREEN", label: "Green", color: "bg-green-500" },
  { value: "BROWN", label: "Brown", color: "bg-amber-700" },
  { value: "BLACK", label: "Black", color: "bg-gray-900" },
  { value: "OTHER", label: "Other", color: "bg-gray-400" },
];

export function ActivityRow({ activity, childId, childName = "Baby", autoOpenEdit = false, onEditClose }: ActivityRowProps) {
  const [editOpen, setEditOpen] = useState(autoOpenEdit);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Edit state for sleep
  const [editSleepType, setEditSleepType] = useState<"NAP" | "NIGHT">("NAP");
  const [editSleepStart, setEditSleepStart] = useState<Date | null>(null);
  const [editSleepEnd, setEditSleepEnd] = useState<Date | null>(null);

  // Edit state for breast feeding
  const [editBreastSide, setEditBreastSide] = useState<"LEFT" | "RIGHT" | "BOTH">("LEFT");
  const [editBreastStart, setEditBreastStart] = useState<Date | null>(null);
  const [editBreastEnd, setEditBreastEnd] = useState<Date | null>(null);
  const [editLeftDurationSeconds, setEditLeftDurationSeconds] = useState<number>(0);
  const [editRightDurationSeconds, setEditRightDurationSeconds] = useState<number>(0);

  // Edit state for bottle
  const [editBottleContentType, setEditBottleContentType] = useState<"FORMULA" | "BREAST_MILK">("FORMULA");
  const [editBottleAmountOz, setEditBottleAmountOz] = useState(3);
  const [editBottleTime, setEditBottleTime] = useState<Date | null>(null);
  const [editBottleUnit, setEditBottleUnit] = useState<"oz" | "ml">("oz");

  // Edit state for diaper
  const [editDiaperType, setEditDiaperType] = useState<"WET" | "DIRTY" | "BOTH" | "DRY">("WET");
  const [editDiaperColor, setEditDiaperColor] = useState<DiaperColor | null>(null);
  const [editDiaperAmount, setEditDiaperAmount] = useState<DiaperAmount | null>(null);
  const [editDiaperTime, setEditDiaperTime] = useState<Date | null>(null);

  // Helper to close edit dialog and notify parent
  const closeEditDialog = () => {
    setEditOpen(false);
    onEditClose?.();
  };

  // Initialize edit state when dialog opens
  useEffect(() => {
    if (editOpen) {
      if (activity.type === "SLEEP") {
        const r = activity.record;
        setEditSleepType(r.sleepType as "NAP" | "NIGHT");
        setEditSleepStart(new Date(r.startTime));
        setEditSleepEnd(r.endTime ? new Date(r.endTime) : null);
      } else if (activity.type === "FEEDING") {
        const r = activity.record;
        if (r.feedingType === "BREAST") {
          setEditBreastSide((r.side as "LEFT" | "RIGHT" | "BOTH") || "LEFT");
          setEditBreastStart(new Date(r.startTime));
          setEditBreastEnd(r.endTime ? new Date(r.endTime) : null);

          // Initialize per-side durations from record or calculate from total duration
          if (r.leftDurationSeconds != null || r.rightDurationSeconds != null) {
            setEditLeftDurationSeconds(r.leftDurationSeconds ?? 0);
            setEditRightDurationSeconds(r.rightDurationSeconds ?? 0);
          } else if (r.endTime) {
            // Backwards compatibility: split based on side field
            const totalSeconds = Math.floor((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 1000);
            if (r.side === "LEFT") {
              setEditLeftDurationSeconds(totalSeconds);
              setEditRightDurationSeconds(0);
            } else if (r.side === "RIGHT") {
              setEditLeftDurationSeconds(0);
              setEditRightDurationSeconds(totalSeconds);
            } else {
              // BOTH - split evenly
              setEditLeftDurationSeconds(Math.floor(totalSeconds / 2));
              setEditRightDurationSeconds(totalSeconds - Math.floor(totalSeconds / 2));
            }
          }
        } else if (r.feedingType === "BOTTLE") {
          setEditBottleContentType((r.bottleContentType as "FORMULA" | "BREAST_MILK") || "FORMULA");
          setEditBottleAmountOz(r.amountMl ? mlToOz(r.amountMl) : 3);
          setEditBottleTime(new Date(r.startTime));
        }
      } else if (activity.type === "DIAPER") {
        const r = activity.record;
        setEditDiaperType((r.diaperType as "WET" | "DIRTY" | "BOTH" | "DRY") || "WET");
        setEditDiaperColor((r.color as DiaperColor) || null);
        setEditDiaperAmount((r.amount as DiaperAmount) || null);
        setEditDiaperTime(new Date(r.time));
      }
    }
  }, [editOpen, activity]);

  // Delete mutations
  const deleteSleep = trpc.sleep.delete.useMutation({
    onSuccess: () => {
      utils.sleep.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getDay.invalidate({ childId });
      toast({ title: "Sleep record deleted" });
      setDeleteConfirmOpen(false);
      closeEditDialog();
    },
  });

  const deleteFeeding = trpc.feeding.delete.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getDay.invalidate({ childId });
      toast({ title: "Feeding record deleted" });
      setDeleteConfirmOpen(false);
      closeEditDialog();
    },
  });

  const deleteDiaper = trpc.diaper.delete.useMutation({
    onSuccess: () => {
      utils.diaper.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getDay.invalidate({ childId });
      toast({ title: "Diaper record deleted" });
      setDeleteConfirmOpen(false);
      closeEditDialog();
    },
  });

  const deletePumping = trpc.pumping.delete.useMutation({
    onSuccess: () => {
      utils.pumping.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Pumping record deleted" });
      setDeleteConfirmOpen(false);
      closeEditDialog();
    },
  });

  const deleteMedicine = trpc.medicine.deleteRecord.useMutation({
    onSuccess: () => {
      utils.medicine.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Medicine record deleted" });
      setDeleteConfirmOpen(false);
      closeEditDialog();
    },
  });

  const deleteGrowth = trpc.growth.delete.useMutation({
    onSuccess: () => {
      utils.growth.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Growth record deleted" });
      setDeleteConfirmOpen(false);
      closeEditDialog();
    },
  });

  const deleteTemperature = trpc.temperature.delete.useMutation({
    onSuccess: () => {
      utils.temperature.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Temperature record deleted" });
      setDeleteConfirmOpen(false);
      closeEditDialog();
    },
  });

  const deleteActivity = trpc.activity.delete.useMutation({
    onSuccess: () => {
      utils.activity.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Activity record deleted" });
      setDeleteConfirmOpen(false);
      closeEditDialog();
    },
  });

  // Update mutations
  const updateSleep = trpc.sleep.update.useMutation({
    onSuccess: () => {
      utils.sleep.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getDay.invalidate({ childId });
      toast({ title: "Sleep record updated" });
      closeEditDialog();
    },
  });

  const updateFeeding = trpc.feeding.update.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getDay.invalidate({ childId });
      toast({ title: "Feeding record updated" });
      closeEditDialog();
    },
  });

  const updateDiaper = trpc.diaper.update.useMutation({
    onSuccess: () => {
      utils.diaper.list.invalidate();
      utils.timeline.getList.invalidate({ childId });
      utils.timeline.getDay.invalidate({ childId });
      toast({ title: "Diaper record updated" });
      closeEditDialog();
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
      case "PUMPING":
        deletePumping.mutate({ id: activity.record.id });
        break;
      case "MEDICINE":
        deleteMedicine.mutate({ id: activity.record.id });
        break;
      case "GROWTH":
        deleteGrowth.mutate({ id: activity.record.id });
        break;
      case "TEMPERATURE":
        deleteTemperature.mutate({ id: activity.record.id });
        break;
      case "ACTIVITY":
        deleteActivity.mutate({ id: activity.record.id });
        break;
    }
  };

  const handleSave = () => {
    switch (activity.type) {
      case "SLEEP":
        if (editSleepStart) {
          updateSleep.mutate({
            id: activity.record.id,
            sleepType: editSleepType,
            startTime: editSleepStart,
            endTime: editSleepEnd,
          });
        }
        break;
      case "FEEDING":
        const r = activity.record as FeedingRecord;
        if (r.feedingType === "BREAST" && editBreastStart) {
          updateFeeding.mutate({
            id: activity.record.id,
            side: editBreastSide,
            startTime: editBreastStart,
            endTime: editBreastEnd,
            leftDurationSeconds: editLeftDurationSeconds,
            rightDurationSeconds: editRightDurationSeconds,
          });
        } else if (r.feedingType === "BOTTLE" && editBottleTime) {
          const amountMl = editBottleUnit === "oz"
            ? ozToMl(editBottleAmountOz)
            : Math.round(editBottleAmountOz);
          updateFeeding.mutate({
            id: activity.record.id,
            bottleContentType: editBottleContentType,
            amountMl,
            startTime: editBottleTime,
          });
        }
        break;
      case "DIAPER":
        if (editDiaperTime) {
          updateDiaper.mutate({
            id: activity.record.id,
            diaperType: editDiaperType,
            color: editDiaperColor,
            amount: editDiaperAmount,
            time: editDiaperTime,
          });
        }
        break;
    }
  };

  const isDeleting =
    deleteSleep.isPending || deleteFeeding.isPending || deleteDiaper.isPending ||
    deletePumping.isPending || deleteMedicine.isPending || deleteGrowth.isPending ||
    deleteTemperature.isPending || deleteActivity.isPending;
  const isSaving =
    updateSleep.isPending || updateFeeding.isPending || updateDiaper.isPending;

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
        // Show side details with per-side times if available
        if (r.leftDurationSeconds != null && r.rightDurationSeconds != null && (r.leftDurationSeconds > 0 || r.rightDurationSeconds > 0)) {
          const formatSecs = (s: number) => {
            const mins = Math.floor(s / 60);
            const secs = s % 60;
            return secs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins}m`;
          };
          if (r.leftDurationSeconds > 0 && r.rightDurationSeconds > 0) {
            details = `L: ${formatSecs(r.leftDurationSeconds)} R: ${formatSecs(r.rightDurationSeconds)}`;
          } else if (r.leftDurationSeconds > 0) {
            details = "Left";
          } else {
            details = "Right";
          }
        } else {
          details = r.side === "LEFT" ? "Left" : r.side === "RIGHT" ? "Right" : "Both";
        }
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
    case "PUMPING": {
      category = "pumping";
      const r = activity.record;
      const duration = r.endTime ? formatDurationPrecise(r.startTime, r.endTime) : "";
      const amount = r.amountMl ? `${Math.round(r.amountMl / 29.574)}oz` : "";
      description = duration
        ? `Pumped ${amount ? amount + " in " : ""}${duration}`
        : "Pumping in progress";
      timeDisplay = r.endTime
        ? formatTimeRange(r.startTime, r.endTime)
        : `${formatTimeShort(r.startTime)} - ongoing`;
      details = amount || "";
      break;
    }
    case "MEDICINE": {
      category = "medicine";
      const r = activity.record;
      const amountStr = r.amount && r.unit ? `${r.amount} ${r.unit}` : "";
      description = `${childName} took ${r.medicine.name}${amountStr ? ` (${amountStr})` : ""}`;
      timeDisplay = formatTimeShort(r.time);
      details = "";
      break;
    }
    case "GROWTH": {
      category = "growth";
      const r = activity.record;
      const parts: string[] = [];
      if (r.weightOz) {
        const lbs = Math.floor(r.weightOz / 16);
        const oz = r.weightOz % 16;
        parts.push(`${lbs}lb ${oz}oz`);
      }
      if (r.heightIn) {
        const ft = Math.floor(r.heightIn / 12);
        const inches = r.heightIn % 12;
        parts.push(`${ft}ft ${inches}in`);
      }
      description = `${childName} growth: ${parts.join(", ") || "recorded"}`;
      timeDisplay = formatTimeShort(r.date);
      details = "";
      break;
    }
    case "TEMPERATURE": {
      category = "temperature";
      const r = activity.record;
      const tempF = (r.temperatureCelsius * 9/5) + 32;
      description = `${childName}'s temperature: ${tempF.toFixed(1)}°F`;
      timeDisplay = formatTimeShort(r.time);
      details = tempF >= 100.4 ? "Fever" : "";
      break;
    }
    case "ACTIVITY": {
      category = "activity";
      const r = activity.record;
      const duration = r.endTime ? formatDurationPrecise(r.startTime, r.endTime) : "";
      const activityName = r.activityType.replace(/_/g, " ").toLowerCase();
      description = duration
        ? `${childName} did ${activityName} for ${duration}`
        : `${childName} is doing ${activityName}`;
      timeDisplay = r.endTime
        ? formatTimeRange(r.startTime, r.endTime)
        : `${formatTimeShort(r.startTime)} - ongoing`;
      details = "";
      break;
    }
  }

  const Icon = iconMap[category];
  const iconClasses = getActivityIconClasses(category);

  // Render edit form based on activity type
  const renderEditForm = () => {
    if (activity.type === "SLEEP") {
      return (
        <div className="space-y-4">
          <SimpleToggleGroup
            options={[
              { value: "NAP", label: "Nap" },
              { value: "NIGHT", label: "Night" },
            ]}
            value={editSleepType}
            onChange={setEditSleepType}
            className="mx-0 my-0"
          />
          <TimeRow label="Start Time" value={editSleepStart} onChange={setEditSleepStart} />
          <TimeRow label="End Time" value={editSleepEnd} onChange={setEditSleepEnd} placeholder="Set time" />
        </div>
      );
    }

    if (activity.type === "FEEDING") {
      const r = activity.record as FeedingRecord;

      if (r.feedingType === "BREAST") {
        const totalSeconds = editLeftDurationSeconds + editRightDurationSeconds;
        const sliderValue = totalSeconds > 0 ? (editLeftDurationSeconds / totalSeconds) * 100 : 50;

        const formatDuration = (seconds: number) => {
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins}:${String(secs).padStart(2, "0")}`;
        };

        const handleSliderChange = (value: number[]) => {
          const leftPercent = value[0] / 100;
          const newLeftSeconds = Math.round(totalSeconds * leftPercent);
          const newRightSeconds = totalSeconds - newLeftSeconds;
          setEditLeftDurationSeconds(newLeftSeconds);
          setEditRightDurationSeconds(newRightSeconds);

          // Update side based on where the time is
          if (newLeftSeconds > 0 && newRightSeconds > 0) {
            setEditBreastSide("BOTH");
          } else if (newLeftSeconds > 0) {
            setEditBreastSide("LEFT");
          } else {
            setEditBreastSide("RIGHT");
          }
        };

        return (
          <div className="space-y-4">
            <TimeRow label="Start Time" value={editBreastStart} onChange={setEditBreastStart} />
            <TimeRow label="End Time" value={editBreastEnd} onChange={setEditBreastEnd} placeholder="Set time" />

            {totalSeconds > 0 && (
              <div className="py-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-muted-foreground">Duration Split</span>
                  <span className="text-sm font-medium">
                    Total: {formatDuration(totalSeconds)}
                  </span>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-primary font-medium">Left: {formatDuration(editLeftDurationSeconds)}</span>
                  <span className="text-primary font-medium">Right: {formatDuration(editRightDurationSeconds)}</span>
                </div>

                <Slider
                  value={[sliderValue]}
                  onValueChange={handleSliderChange}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />

                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>All Left</span>
                  <span>All Right</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Last breast used</p>
              <SimpleToggleGroup
                options={[
                  { value: "LEFT", label: "Left" },
                  { value: "RIGHT", label: "Right" },
                  { value: "BOTH", label: "Both" },
                ]}
                value={editBreastSide}
                onChange={setEditBreastSide}
                className="mx-0 my-0"
              />
            </div>
          </div>
        );
      }

      if (r.feedingType === "BOTTLE") {
        const displayAmount = editBottleUnit === "oz"
          ? editBottleAmountOz.toFixed(1)
          : Math.round(ozToMl(editBottleAmountOz));
        const maxAmount = editBottleUnit === "oz" ? 12 : 350;

        return (
          <div className="space-y-4">
            <SimpleToggleGroup
              options={[
                { value: "FORMULA", label: "Formula" },
                { value: "BREAST_MILK", label: "Breast Milk" },
              ]}
              value={editBottleContentType}
              onChange={setEditBottleContentType}
              className="mx-0 my-0"
            />
            <TimeRow label="Time" value={editBottleTime} onChange={setEditBottleTime} />
            <div className="py-4 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Amount</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold">{displayAmount} {editBottleUnit}</span>
                  <div className="flex rounded overflow-hidden border border-border ml-2">
                    <button
                      onClick={() => setEditBottleUnit("oz")}
                      className={`px-3 py-1 text-sm ${editBottleUnit === "oz" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                      oz
                    </button>
                    <button
                      onClick={() => setEditBottleUnit("ml")}
                      className={`px-3 py-1 text-sm ${editBottleUnit === "ml" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                      mL
                    </button>
                  </div>
                </div>
              </div>
              <Slider
                value={[editBottleUnit === "oz" ? editBottleAmountOz : ozToMl(editBottleAmountOz)]}
                onValueChange={([val]) => setEditBottleAmountOz(editBottleUnit === "oz" ? val : mlToOz(val))}
                max={maxAmount}
                step={editBottleUnit === "oz" ? 0.5 : 10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>{maxAmount}</span>
              </div>
            </div>
          </div>
        );
      }

      // Solids - just show read-only for now
      return (
        <div className="flex items-center gap-3">
          <div className={iconClasses}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">{description}</p>
            <p className="text-sm text-muted-foreground">{timeDisplay}</p>
          </div>
        </div>
      );
    }

    if (activity.type === "DIAPER") {
      const typeOptions = [
        { value: "WET" as const, label: "Wet", icon: Droplets },
        { value: "DIRTY" as const, label: "Dirty", icon: Cloud },
        { value: "BOTH" as const, label: "Mixed", icon: CloudRain },
      ];

      const showColorPicker = editDiaperType === "DIRTY" || editDiaperType === "BOTH";

      return (
        <div className="space-y-4">
          <TimeRow label="Time" value={editDiaperTime} onChange={setEditDiaperTime} />

          <div className="py-4 border-t border-border">
            <div className="flex justify-center gap-4">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEditDiaperType(option.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-full w-20 h-20 transition-colors ${
                    editDiaperType === option.value
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-muted border-2 border-transparent hover:bg-muted/80"
                  }`}
                >
                  <option.icon className={`h-6 w-6 ${editDiaperType === option.value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-xs ${editDiaperType === option.value ? "text-primary" : "text-muted-foreground"}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {showColorPicker && (
            <div className="py-3 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Color</p>
              <div className="flex gap-2 justify-center">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setEditDiaperColor(editDiaperColor === option.value ? null : option.value)}
                    className={`w-10 h-10 rounded-full ${option.color} transition-all ${
                      editDiaperColor === option.value
                        ? "ring-2 ring-primary ring-offset-2"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    title={option.label}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="py-3 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Amount</p>
            <div className="flex gap-3 justify-center">
              {amountOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEditDiaperAmount(editDiaperAmount === option.value ? null : option.value)}
                  className={`w-12 h-12 rounded-full text-sm font-medium transition-colors ${
                    editDiaperAmount === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Read-only view for pumping, medicine, growth, temperature, activity
    // These types support delete but not edit (yet)
    if (activity.type === "PUMPING" || activity.type === "MEDICINE" ||
        activity.type === "GROWTH" || activity.type === "TEMPERATURE" ||
        activity.type === "ACTIVITY") {
      return (
        <div className="flex items-center gap-3">
          <div className={iconClasses}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">{description}</p>
            <p className="text-sm text-muted-foreground">{timeDisplay}</p>
          </div>
        </div>
      );
    }

    return null;
  };

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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) closeEditDialog(); else setEditOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>

          {renderEditForm()}

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? "Saving..." : "Save"}
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
