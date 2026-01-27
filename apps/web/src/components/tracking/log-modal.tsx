"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/provider";
import { useTimer } from "@/hooks/use-timer";
import {
  useTimerStore,
  getLeftElapsedMs,
  getRightElapsedMs,
  getTotalBreastfeedingElapsedMs,
} from "@/stores/timer-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { TimeRow } from "@/components/ui/time-row";
import { SimpleToggleGroup } from "@/components/ui/simple-toggle-group";
import { useToast } from "@/hooks/use-toast";
import { mlToOz, ozToMl } from "@finnberry/utils";
import { Play, Square, Droplets, Cloud, CloudRain, Plus, Check, X } from "lucide-react";
import { TimerDisplay } from "@/components/tracking/timer-display";
import { BreastSideButton } from "@/components/tracking/breast-side-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type LogType = "sleep" | "breast" | "bottle" | "diaper" | "solids" | "pumping" | "medicine";

interface LogModalProps {
  childId: string;
  type: LogType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogModal({ childId, type, open, onOpenChange }: LogModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {type === "sleep" && (
          <SleepModal childId={childId} onClose={() => onOpenChange(false)} />
        )}
        {type === "breast" && (
          <BreastModal childId={childId} onClose={() => onOpenChange(false)} />
        )}
        {type === "bottle" && (
          <BottleModal childId={childId} onClose={() => onOpenChange(false)} />
        )}
        {type === "diaper" && (
          <DiaperModal childId={childId} onClose={() => onOpenChange(false)} />
        )}
        {type === "solids" && (
          <SolidsModal childId={childId} onClose={() => onOpenChange(false)} />
        )}
        {type === "pumping" && (
          <PumpingModal childId={childId} onClose={() => onOpenChange(false)} />
        )}
        {type === "medicine" && (
          <MedicineModal childId={childId} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SleepModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const sleepTimer = useTimer(childId, "sleep");
  const stopTimer = useTimerStore((state) => state.stopTimer);

  const [sleepType, setSleepType] = useState<"NAP" | "NIGHT">("NAP");
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Sync sleepType with running timer's metadata
  useEffect(() => {
    if (sleepTimer.isRunning && sleepTimer.timer?.metadata?.sleepType) {
      setSleepType(sleepTimer.timer.metadata.sleepType);
    }
  }, [sleepTimer.isRunning, sleepTimer.timer?.metadata?.sleepType]);

  const startSleep = trpc.sleep.start.useMutation({
    onSuccess: (result) => {
      utils.sleep.getActive.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      sleepTimer.start({ sleepType });
      sleepTimer.update({ recordId: result.id });
      toast({ title: "Sleep timer started" });
      // Don't close - stay in modal to show running timer
    },
  });

  const endSleep = trpc.sleep.end.useMutation({
    onSuccess: () => {
      utils.sleep.list.invalidate();
      utils.sleep.summary.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Sleep recorded" });
      onClose();
    },
  });

  const logSleep = trpc.sleep.log.useMutation({
    onSuccess: () => {
      utils.sleep.list.invalidate();
      utils.sleep.summary.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Sleep recorded" });
      onClose();
    },
  });

  const handleStart = () => {
    if (startTime) {
      startSleep.mutate({ childId, sleepType, startTime });
    }
  };

  const handleStop = async () => {
    if (sleepTimer.timer?.recordId) {
      stopTimer(sleepTimer.timer.id);
      await endSleep.mutateAsync({ id: sleepTimer.timer.recordId });
    }
  };

  const handleManualSave = () => {
    if (endTime && startTime) {
      logSleep.mutate({
        childId,
        sleepType,
        startTime,
        endTime,
      });
    }
  };

  const isLoading = startSleep.isPending || logSleep.isPending || endSleep.isPending;

  // Timer is running - show running state
  if (sleepTimer.isRunning && !showManualEntry) {
    const runningType = sleepTimer.timer?.metadata?.sleepType === "NIGHT" ? "Night Sleep" : "Nap";

    return (
      <>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-center">Sleep in Progress</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-8 gap-4">
          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            {runningType}
          </span>
          <TimerDisplay elapsedMs={sleepTimer.elapsedMs} size="large" />
        </div>

        <div className="p-6 pt-0 flex flex-col gap-3">
          <Button
            size="lg"
            variant="destructive"
            className="w-full h-14 text-lg"
            onClick={handleStop}
            disabled={isLoading}
          >
            <Square className="h-5 w-5 mr-2" />
            Stop
          </Button>
        </div>
      </>
    );
  }

  // Manual entry mode
  if (showManualEntry) {
    return (
      <>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-center">Log Sleep</DialogTitle>
        </DialogHeader>

        <SimpleToggleGroup
          options={[
            { value: "NAP", label: "Nap" },
            { value: "NIGHT", label: "Night" },
          ]}
          value={sleepType}
          onChange={setSleepType}
        />

        <TimeRow label="Start Time" value={startTime} onChange={setStartTime} />
        <TimeRow label="End Time" value={endTime} onChange={setEndTime} placeholder="Set time" />

        <div className="p-6 pt-4 flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={handleManualSave}
            disabled={isLoading || !startTime || !endTime}
          >
            Save
          </Button>
          <button
            onClick={() => setShowManualEntry(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Start Timer Instead
          </button>
        </div>
      </>
    );
  }

  // Default: Start timer UI
  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Add Sleep</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col items-center py-6 gap-6">
        <TimerDisplay elapsedMs={0} />

        <SimpleToggleGroup
          options={[
            { value: "NAP", label: "Nap" },
            { value: "NIGHT", label: "Night" },
          ]}
          value={sleepType}
          onChange={setSleepType}
        />

        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-32 h-32 rounded-full bg-primary/20 border-2 border-dashed border-primary flex flex-col items-center justify-center gap-2 hover:bg-primary/30 transition-colors disabled:opacity-50"
        >
          <Play className="h-8 w-8 text-primary" />
          <span className="text-primary font-semibold">START</span>
        </button>
      </div>

      <div className="p-6 pt-0 flex justify-center">
        <button
          onClick={() => setShowManualEntry(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Manual Entry
        </button>
      </div>
    </>
  );
}

function BreastModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const feedingTimer = useTimer(childId, "feeding");
  const stopTimer = useTimerStore((state) => state.stopTimer);
  const switchSideInStore = useTimerStore((state) => state.switchBreastfeedingSide);

  const [side, setSide] = useState<"LEFT" | "RIGHT">("LEFT");
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Force re-render every second to update elapsed time displays
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!feedingTimer.isRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [feedingTimer.isRunning]);

  // Query for last side info
  const { data: summary } = trpc.feeding.summary.useQuery({
    childId,
    period: "today",
  });

  // Determine which side was used last
  const lastSide: "LEFT" | "RIGHT" | null = (() => {
    if (!summary?.lastLeftSide && !summary?.lastRightSide) return null;
    if (!summary.lastLeftSide) return "RIGHT";
    if (!summary.lastRightSide) return "LEFT";
    return new Date(summary.lastLeftSide) > new Date(summary.lastRightSide)
      ? "LEFT"
      : "RIGHT";
  })();

  const startBreastfeeding = trpc.feeding.startBreastfeeding.useMutation({
    onSuccess: (result) => {
      utils.feeding.getActive.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      feedingTimer.start({ feedingSide: side });
      feedingTimer.update({ recordId: result.id });
      toast({ title: "Feeding timer started" });
      // Don't close - stay in modal to show running timer
    },
  });

  const endBreastfeeding = trpc.feeding.endBreastfeeding.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.feeding.summary.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Feeding recorded" });
      onClose();
    },
  });

  const logBreastfeeding = trpc.feeding.logBreastfeeding.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.feeding.summary.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Breastfeeding recorded" });
      onClose();
    },
  });

  const switchBreastfeedingSide = trpc.feeding.switchBreastfeedingSide.useMutation();

  const handleSideClick = (clickedSide: "LEFT" | "RIGHT") => {
    if (feedingTimer.isRunning) {
      // Switch sides - calculate current per-side times before switching
      const timer = feedingTimer.timer;
      if (!timer?.recordId) return;

      const leftMs = getLeftElapsedMs(timer);
      const rightMs = getRightElapsedMs(timer);

      // Switch side in store
      switchSideInStore(timer.id, clickedSide);

      // Update database with accumulated times
      switchBreastfeedingSide.mutate({
        id: timer.recordId,
        newSide: clickedSide,
        leftDurationSeconds: Math.round(leftMs / 1000),
        rightDurationSeconds: Math.round(rightMs / 1000),
      });
      return;
    }
    setSide(clickedSide);
    // Start the timer immediately when clicking a side
    startBreastfeeding.mutate({ childId, side: clickedSide, startTime: new Date() });
  };

  const handleStop = async () => {
    const timer = feedingTimer.timer;
    if (timer?.recordId) {
      // Calculate final per-side durations
      const leftMs = getLeftElapsedMs(timer);
      const rightMs = getRightElapsedMs(timer);

      // Determine final side based on which has more time, or BOTH if both used
      const usedBothSides = leftMs > 0 && rightMs > 0;
      const finalSide = usedBothSides ? "BOTH" : (leftMs > 0 ? "LEFT" : "RIGHT");

      stopTimer(timer.id);
      await endBreastfeeding.mutateAsync({
        id: timer.recordId,
        side: finalSide,
        leftDurationSeconds: Math.round(leftMs / 1000),
        rightDurationSeconds: Math.round(rightMs / 1000),
      });
    }
  };

  const handleManualSave = () => {
    if (endTime && startTime) {
      logBreastfeeding.mutate({
        childId,
        side,
        startTime,
        endTime,
      });
    }
  };

  const isLoading = startBreastfeeding.isPending || logBreastfeeding.isPending || endBreastfeeding.isPending || switchBreastfeedingSide.isPending;
  const activeSide = feedingTimer.timer?.metadata?.feedingSide as "LEFT" | "RIGHT" | undefined;

  // Calculate per-side elapsed times for display
  const leftElapsedMs = getLeftElapsedMs(feedingTimer.timer);
  const rightElapsedMs = getRightElapsedMs(feedingTimer.timer);
  const totalElapsedMs = getTotalBreastfeedingElapsedMs(feedingTimer.timer);

  // Timer is running - show running state
  if (feedingTimer.isRunning && !showManualEntry) {
    return (
      <>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-center">Breastfeeding</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 gap-6">
          <TimerDisplay elapsedMs={totalElapsedMs} size="large" />

          <div className="flex gap-6">
            <BreastSideButton
              side="LEFT"
              isActive={activeSide === "LEFT"}
              isLastSide={false}
              elapsedMs={leftElapsedMs}
              onClick={() => handleSideClick("LEFT")}
              disabled={activeSide === "LEFT" || isLoading}
            />
            <BreastSideButton
              side="RIGHT"
              isActive={activeSide === "RIGHT"}
              isLastSide={false}
              elapsedMs={rightElapsedMs}
              onClick={() => handleSideClick("RIGHT")}
              disabled={activeSide === "RIGHT" || isLoading}
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex flex-col gap-3">
          <Button
            size="lg"
            variant="destructive"
            className="w-full h-14 text-lg"
            onClick={handleStop}
            disabled={isLoading}
          >
            <Square className="h-5 w-5 mr-2" />
            Stop
          </Button>
        </div>
      </>
    );
  }

  // Manual entry mode
  if (showManualEntry) {
    return (
      <>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-center">Log Breastfeeding</DialogTitle>
        </DialogHeader>

        <SimpleToggleGroup
          options={[
            { value: "LEFT", label: "Left" },
            { value: "RIGHT", label: "Right" },
          ]}
          value={side}
          onChange={(val) => setSide(val as "LEFT" | "RIGHT")}
        />

        <TimeRow label="Start Time" value={startTime} onChange={setStartTime} />
        <TimeRow label="End Time" value={endTime} onChange={setEndTime} placeholder="Set time" />

        <div className="p-6 pt-4 flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={handleManualSave}
            disabled={isLoading || !startTime || !endTime}
          >
            Save
          </Button>
          <button
            onClick={() => setShowManualEntry(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Start Timer Instead
          </button>
        </div>
      </>
    );
  }

  // Default: Huckleberry-style start UI with large side buttons
  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Add Breastfeeding</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col items-center py-6 gap-6">
        <TimerDisplay elapsedMs={0} />

        <div className="flex gap-6">
          <BreastSideButton
            side="LEFT"
            isActive={false}
            isLastSide={lastSide === "LEFT"}
            onClick={() => handleSideClick("LEFT")}
            disabled={isLoading}
          />
          <BreastSideButton
            side="RIGHT"
            isActive={false}
            isLastSide={lastSide === "RIGHT"}
            onClick={() => handleSideClick("RIGHT")}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="p-6 pt-0 flex justify-center">
        <button
          onClick={() => setShowManualEntry(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Manual Entry
        </button>
      </div>
    </>
  );
}

function BottleModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [contentType, setContentType] = useState<"FORMULA" | "BREAST_MILK">("FORMULA");
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [unit, setUnit] = useState<"oz" | "ml">("oz");
  const [amountOz, setAmountOz] = useState(3);

  const logBottle = trpc.feeding.logBottle.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.feeding.summary.invalidate({ childId });
      toast({ title: "Bottle feeding logged" });
      onClose();
    },
  });

  const handleSave = () => {
    if (!startTime) return;
    const amountMl = unit === "oz" ? ozToMl(amountOz) : Math.round(amountOz);
    logBottle.mutate({
      childId,
      startTime,
      amountMl,
      bottleContentType: contentType,
    });
  };

  const displayAmount = unit === "oz" ? amountOz.toFixed(1) : Math.round(ozToMl(amountOz));
  const maxAmount = unit === "oz" ? 12 : 350;

  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Add Bottle</DialogTitle>
      </DialogHeader>

      <SimpleToggleGroup
        options={[
          { value: "FORMULA", label: "Formula" },
          { value: "BREAST_MILK", label: "Breast Milk" },
        ]}
        value={contentType}
        onChange={setContentType}
      />

      <TimeRow label="Start Time" value={startTime} onChange={setStartTime} />

      <div className="py-4 px-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground">Amount</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">{displayAmount} {unit}</span>
            <div className="flex rounded overflow-hidden border border-border ml-2">
              <button
                onClick={() => setUnit("oz")}
                className={`px-3 py-1 text-sm ${unit === "oz" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                oz
              </button>
              <button
                onClick={() => setUnit("ml")}
                className={`px-3 py-1 text-sm ${unit === "ml" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                mL
              </button>
            </div>
          </div>
        </div>
        <Slider
          value={[unit === "oz" ? amountOz : ozToMl(amountOz)]}
          onValueChange={([val]) => setAmountOz(unit === "oz" ? val : mlToOz(val))}
          max={maxAmount}
          step={unit === "oz" ? 0.5 : 10}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0</span>
          <span>{maxAmount}</span>
        </div>
      </div>

      <div className="p-6">
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          onClick={handleSave}
          disabled={logBottle.isPending || !startTime}
        >
          Save
        </Button>
      </div>
    </>
  );
}

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

function DiaperModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [time, setTime] = useState<Date | null>(new Date());
  const [diaperType, setDiaperType] = useState<"WET" | "DIRTY" | "BOTH" | "DRY">("WET");
  const [amount, setAmount] = useState<DiaperAmount | null>(null);
  const [color, setColor] = useState<DiaperColor | null>(null);

  const logDiaper = trpc.diaper.log.useMutation({
    onSuccess: () => {
      utils.diaper.list.invalidate();
      utils.diaper.summary.invalidate({ childId });
      toast({ title: "Diaper change logged" });
      onClose();
    },
  });

  const handleSave = () => {
    logDiaper.mutate({
      childId,
      diaperType,
      time: time ?? undefined,
      amount: amount ?? undefined,
      color: color ?? undefined,
    });
  };

  const typeOptions = [
    { value: "WET" as const, label: "Wet", icon: Droplets },
    { value: "DIRTY" as const, label: "Dirty", icon: Cloud },
    { value: "BOTH" as const, label: "Mixed", icon: CloudRain },
  ];

  const showColorPicker = diaperType === "DIRTY" || diaperType === "BOTH";

  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Add Diaper</DialogTitle>
      </DialogHeader>

      <TimeRow label="Time" value={time} onChange={setTime} />

      <div className="px-6 py-4">
        <div className="flex justify-center gap-4">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDiaperType(option.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-full w-20 h-20 transition-colors ${
                diaperType === option.value
                  ? "bg-primary/20 border-2 border-primary"
                  : "bg-muted border-2 border-transparent hover:bg-muted/80"
              }`}
            >
              <option.icon className={`h-6 w-6 ${diaperType === option.value ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-xs ${diaperType === option.value ? "text-primary" : "text-muted-foreground"}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {showColorPicker && (
        <div className="px-6 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Color</p>
          <div className="flex gap-2 justify-center">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setColor(color === option.value ? null : option.value)}
                className={`w-10 h-10 rounded-full ${option.color} transition-all ${
                  color === option.value
                    ? "ring-2 ring-primary ring-offset-2"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={option.label}
              />
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-3 border-t border-border">
        <p className="text-sm text-muted-foreground mb-2">Amount</p>
        <div className="flex gap-3 justify-center">
          {amountOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setAmount(amount === option.value ? null : option.value)}
              className={`w-12 h-12 rounded-full text-sm font-medium transition-colors ${
                amount === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 pt-4">
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          onClick={handleSave}
          disabled={logDiaper.isPending}
        >
          Save
        </Button>
      </div>
    </>
  );
}

// Popular foods list for solids modal
const POPULAR_FOODS = [
  "avocado", "banana", "apple", "rice cereal",
  "sweet potato", "oatmeal", "spinach", "chicken",
  "peas", "pear", "yogurt", "carrot",
  "broccoli", "prune", "green bean", "mango",
];

function SolidsModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [customFood, setCustomFood] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState("");

  const logSolids = trpc.feeding.logSolids.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.feeding.summary.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Solids logged" });
      onClose();
    },
  });

  const handleFoodToggle = (food: string) => {
    setSelectedFoods((prev) =>
      prev.includes(food)
        ? prev.filter((f) => f !== food)
        : [...prev, food]
    );
  };

  const handleAddCustomFood = () => {
    const trimmed = customFood.trim();
    if (trimmed && !selectedFoods.includes(trimmed)) {
      setSelectedFoods((prev) => [...prev, trimmed]);
      setCustomFood("");
    }
  };

  const handleSave = () => {
    if (selectedFoods.length === 0 || !startTime) return;
    logSolids.mutate({
      childId,
      startTime,
      foodItems: selectedFoods,
      notes: notes || undefined,
    });
  };

  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Add Solids</DialogTitle>
      </DialogHeader>

      <TimeRow label="Start Time" value={startTime} onChange={setStartTime} />

      <div className="px-6 py-4 border-b border-border">
        <p className="text-sm text-muted-foreground mb-3">Add food <span className="text-xs">(optional custom)</span></p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter foods or add from below"
            value={customFood}
            onChange={(e) => setCustomFood(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCustomFood()}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddCustomFood}
            disabled={!customFood.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selected foods */}
      {selectedFoods.length > 0 && (
        <div className="px-6 py-3 border-b border-border">
          <p className="text-sm text-muted-foreground mb-2">Selected foods</p>
          <div className="flex flex-wrap gap-2">
            {selectedFoods.map((food) => (
              <button
                key={food}
                onClick={() => handleFoodToggle(food)}
                className="flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
              >
                {food}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular foods grid */}
      <div className="px-6 py-4 max-h-64 overflow-y-auto">
        <p className="text-sm text-muted-foreground mb-3">Most popular foods</p>
        <div className="grid grid-cols-4 gap-3">
          {POPULAR_FOODS.map((food) => {
            const isSelected = selectedFoods.includes(food);
            return (
              <button
                key={food}
                onClick={() => handleFoodToggle(food)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  isSelected
                    ? "bg-primary/20 ring-2 ring-primary"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  isSelected ? "bg-primary/30" : "bg-background"
                }`}>
                  {isSelected && <Check className="h-5 w-5 text-primary" />}
                </div>
                <span className="text-xs text-center leading-tight">{food}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="px-6 py-3 border-t border-border">
        <Textarea
          placeholder="Add notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[60px]"
        />
      </div>

      <div className="p-6 pt-0 flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Selected <span className="text-primary font-medium">{selectedFoods.length}</span>
        </span>
        <Button
          size="lg"
          className="flex-1 h-14 text-lg"
          onClick={handleSave}
          disabled={logSolids.isPending || selectedFoods.length === 0}
        >
          Save
        </Button>
      </div>
    </>
  );
}

function PumpingModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const pumpingTimer = useTimer(childId, "pumping");
  const stopTimer = useTimerStore((state) => state.stopTimer);

  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [amountMode, setAmountMode] = useState<"total" | "left/right">("total");
  const [unit, setUnit] = useState<"oz" | "ml">("oz");
  const [leftAmountOz, setLeftAmountOz] = useState(0.25);
  const [rightAmountOz, setRightAmountOz] = useState(0.25);
  const [notes, setNotes] = useState("");

  const startPumping = trpc.pumping.start.useMutation({
    onSuccess: (result) => {
      utils.pumping.list.invalidate();
      utils.timeline.getLastActivities.invalidate({ childId });
      pumpingTimer.start({});
      pumpingTimer.update({ recordId: result.id });
      toast({ title: "Pumping timer started" });
    },
  });

  const endPumping = trpc.pumping.end.useMutation({
    onSuccess: () => {
      utils.pumping.list.invalidate();
      utils.pumping.summary.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Pumping recorded" });
      onClose();
    },
  });

  const logPumping = trpc.pumping.log.useMutation({
    onSuccess: () => {
      utils.pumping.list.invalidate();
      utils.pumping.summary.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Pumping recorded" });
      onClose();
    },
  });

  const handleStart = () => {
    startPumping.mutate({ childId, startTime: startTime ?? undefined });
  };

  const handleStop = async () => {
    if (pumpingTimer.timer?.recordId) {
      const totalMl = amountMode === "total"
        ? ozToMl(leftAmountOz + rightAmountOz)
        : ozToMl(leftAmountOz) + ozToMl(rightAmountOz);

      stopTimer(pumpingTimer.timer.id);
      await endPumping.mutateAsync({
        id: pumpingTimer.timer.recordId,
        amountMl: Math.round(totalMl),
        notes: notes || undefined,
      });
    }
  };

  const handleManualSave = () => {
    if (!startTime) return;
    const totalMl = amountMode === "total"
      ? ozToMl(leftAmountOz + rightAmountOz)
      : ozToMl(leftAmountOz) + ozToMl(rightAmountOz);

    logPumping.mutate({
      childId,
      startTime,
      amountMl: Math.round(totalMl),
      notes: notes || undefined,
    });
  };

  const isLoading = startPumping.isPending || logPumping.isPending || endPumping.isPending;

  // Timer is running - show amount entry
  if (pumpingTimer.isRunning && !showManualEntry) {
    return (
      <>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-center">Pumping in Progress</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <TimerDisplay elapsedMs={pumpingTimer.elapsedMs} size="large" />
        </div>

        <PumpingAmountEntry
          amountMode={amountMode}
          setAmountMode={setAmountMode}
          unit={unit}
          setUnit={setUnit}
          leftAmountOz={leftAmountOz}
          setLeftAmountOz={setLeftAmountOz}
          rightAmountOz={rightAmountOz}
          setRightAmountOz={setRightAmountOz}
        />

        <div className="px-6 py-3 border-t border-border">
          <Textarea
            placeholder="Add note (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px]"
          />
        </div>

        <div className="p-6 pt-0">
          <Button
            size="lg"
            variant="destructive"
            className="w-full h-14 text-lg"
            onClick={handleStop}
            disabled={isLoading}
          >
            <Square className="h-5 w-5 mr-2" />
            Stop
          </Button>
        </div>
      </>
    );
  }

  // Manual entry mode
  if (showManualEntry) {
    return (
      <>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-center">Add Pumping</DialogTitle>
        </DialogHeader>

        <TimeRow label="Start Time" value={startTime} onChange={setStartTime} />

        <PumpingAmountEntry
          amountMode={amountMode}
          setAmountMode={setAmountMode}
          unit={unit}
          setUnit={setUnit}
          leftAmountOz={leftAmountOz}
          setLeftAmountOz={setLeftAmountOz}
          rightAmountOz={rightAmountOz}
          setRightAmountOz={setRightAmountOz}
        />

        <div className="px-6 py-3 border-t border-border">
          <Textarea
            placeholder="Add note (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px]"
          />
        </div>

        <div className="p-6 pt-0 flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={handleManualSave}
            disabled={isLoading || !startTime}
          >
            Save
          </Button>
          <button
            onClick={() => setShowManualEntry(false)}
            className="text-sm text-primary hover:underline"
          >
            Switch to timer
          </button>
        </div>
      </>
    );
  }

  // Default: Start timer UI
  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Add Pumping</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col items-center py-8 gap-6">
        <TimerDisplay elapsedMs={0} />

        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-32 h-32 rounded-full bg-primary/20 border-2 border-dashed border-primary flex flex-col items-center justify-center gap-2 hover:bg-primary/30 transition-colors disabled:opacity-50"
        >
          <Play className="h-8 w-8 text-primary" />
          <span className="text-primary font-semibold">START</span>
        </button>
      </div>

      <div className="p-6 pt-0 flex justify-center">
        <button
          onClick={() => setShowManualEntry(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Manual Entry
        </button>
      </div>
    </>
  );
}

// Sub-component for pumping amount entry (used in timer running and manual modes)
function PumpingAmountEntry({
  amountMode,
  setAmountMode,
  unit,
  setUnit,
  leftAmountOz,
  setLeftAmountOz,
  rightAmountOz,
  setRightAmountOz,
}: {
  amountMode: "total" | "left/right";
  setAmountMode: (mode: "total" | "left/right") => void;
  unit: "oz" | "ml";
  setUnit: (unit: "oz" | "ml") => void;
  leftAmountOz: number;
  setLeftAmountOz: (val: number) => void;
  rightAmountOz: number;
  setRightAmountOz: (val: number) => void;
}) {
  const totalOz = leftAmountOz + rightAmountOz;
  const maxSlider = unit === "oz" ? 8 : Math.round(ozToMl(8));

  const displayValue = (oz: number) =>
    unit === "oz" ? oz.toFixed(2) : Math.round(ozToMl(oz));

  return (
    <div className="px-6 py-4 border-t border-border space-y-4">
      {/* Mode and unit toggles */}
      <div className="flex items-center justify-between">
        <div className="flex rounded overflow-hidden border border-border">
          <button
            onClick={() => setAmountMode("total")}
            className={`px-3 py-1.5 text-sm ${amountMode === "total" ? "bg-muted" : ""}`}
          >
            total
          </button>
          <button
            onClick={() => setAmountMode("left/right")}
            className={`px-3 py-1.5 text-sm ${amountMode === "left/right" ? "bg-primary text-primary-foreground" : ""}`}
          >
            left/right
          </button>
        </div>
        <div className="flex rounded overflow-hidden border border-border">
          <button
            onClick={() => setUnit("oz")}
            className={`px-3 py-1.5 text-sm ${unit === "oz" ? "bg-primary text-primary-foreground" : ""}`}
          >
            oz
          </button>
          <button
            onClick={() => setUnit("ml")}
            className={`px-3 py-1.5 text-sm ${unit === "ml" ? "bg-primary text-primary-foreground" : ""}`}
          >
            ml
          </button>
        </div>
      </div>

      {amountMode === "total" ? (
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{displayValue(totalOz)} {unit}</span>
          </div>
          <Slider
            value={[unit === "oz" ? totalOz : ozToMl(totalOz)]}
            onValueChange={([val]) => {
              const oz = unit === "oz" ? val : mlToOz(val);
              setLeftAmountOz(oz / 2);
              setRightAmountOz(oz / 2);
            }}
            max={maxSlider}
            step={unit === "oz" ? 0.25 : 5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0</span>
            <span>{maxSlider}</span>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Left</span>
              <span className="font-semibold">{displayValue(leftAmountOz)} {unit}</span>
            </div>
            <Slider
              value={[unit === "oz" ? leftAmountOz : ozToMl(leftAmountOz)]}
              onValueChange={([val]) => setLeftAmountOz(unit === "oz" ? val : mlToOz(val))}
              max={maxSlider}
              step={unit === "oz" ? 0.25 : 5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span>{maxSlider}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Right</span>
              <span className="font-semibold">{displayValue(rightAmountOz)} {unit}</span>
            </div>
            <Slider
              value={[unit === "oz" ? rightAmountOz : ozToMl(rightAmountOz)]}
              onValueChange={([val]) => setRightAmountOz(unit === "oz" ? val : mlToOz(val))}
              max={maxSlider}
              step={unit === "oz" ? 0.25 : 5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span>{maxSlider}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type MedicineUnit = "oz" | "ml" | "drops" | "tsp";

function MedicineModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newMedicineName, setNewMedicineName] = useState("");
  const [newMedicineDosage, setNewMedicineDosage] = useState("");
  const [unit, setUnit] = useState<MedicineUnit>("ml");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch existing medicines for this child
  const { data: medicines } = trpc.medicine.list.useQuery({
    childId,
    activeOnly: true,
  });

  const createMedicine = trpc.medicine.create.useMutation({
    onSuccess: (result) => {
      utils.medicine.list.invalidate({ childId });
      setSelectedMedicineId(result.id);
      setShowCreateNew(false);
      toast({ title: "Medicine created" });
    },
  });

  const logMedicineRecord = trpc.medicine.logRecord.useMutation({
    onSuccess: () => {
      utils.medicine.list.invalidate({ childId });
      utils.timeline.getLastActivities.invalidate({ childId });
      toast({ title: "Medicine logged" });
      onClose();
    },
  });

  const handleCreateMedicine = () => {
    if (!newMedicineName.trim() || !newMedicineDosage.trim()) return;
    createMedicine.mutate({
      childId,
      name: newMedicineName.trim(),
      dosage: newMedicineDosage.trim(),
    });
  };

  const handleSave = () => {
    if (!selectedMedicineId || !startTime) return;

    const dosageGiven = amount ? `${amount} ${unit}` : undefined;

    logMedicineRecord.mutate({
      medicineId: selectedMedicineId,
      time: startTime,
      dosageGiven,
      notes: notes || undefined,
    });
  };

  const selectedMedicine = medicines?.find((m: { id: string }) => m.id === selectedMedicineId);
  const isLoading = createMedicine.isPending || logMedicineRecord.isPending;

  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Medicine</DialogTitle>
      </DialogHeader>

      <TimeRow label="Start time" value={startTime} onChange={setStartTime} />

      {/* Medicine type selection */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">Type:</span>
          {showCreateNew ? (
            <button
              onClick={() => setShowCreateNew(false)}
              className="text-sm text-primary hover:underline"
            >
              Select existing
            </button>
          ) : (
            <button
              onClick={() => setShowCreateNew(true)}
              className="text-sm text-primary hover:underline"
            >
              + Add new
            </button>
          )}
        </div>

        {showCreateNew ? (
          <div className="space-y-3">
            <Input
              placeholder="Medicine name"
              value={newMedicineName}
              onChange={(e) => setNewMedicineName(e.target.value)}
            />
            <Input
              placeholder="Default dosage (e.g., 5ml)"
              value={newMedicineDosage}
              onChange={(e) => setNewMedicineDosage(e.target.value)}
            />
            <Button
              onClick={handleCreateMedicine}
              disabled={!newMedicineName.trim() || !newMedicineDosage.trim() || createMedicine.isPending}
              className="w-full"
            >
              Create Medicine
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {medicines?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No medicines. Add one first.</p>
            ) : (
              medicines?.map((medicine: { id: string; name: string }) => (
                <button
                  key={medicine.id}
                  onClick={() => setSelectedMedicineId(medicine.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedMedicineId === medicine.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {medicine.name}
                </button>
              ))
            )}
          </div>
        )}

        {selectedMedicine && (
          <p className="text-xs text-muted-foreground mt-2">
            Default dosage: {selectedMedicine.dosage}
          </p>
        )}
      </div>

      {/* Amount with unit selection */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-muted-foreground">Amount</span>
          <div className="flex rounded overflow-hidden border border-border">
            {(["oz", "ml", "drops", "tsp"] as MedicineUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-2 py-1 text-xs ${unit === u ? "bg-muted" : ""}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <Input
          placeholder="Add amount (optional)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          step="0.1"
          min="0"
        />
      </div>

      {/* Notes */}
      <div className="px-6 py-3">
        <Textarea
          placeholder="Add notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[60px]"
        />
      </div>

      <div className="p-6 pt-0">
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          onClick={handleSave}
          disabled={isLoading || !selectedMedicineId}
        >
          Save
        </Button>
      </div>
    </>
  );
}
