"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { useTimer } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { mlToOz, ozToMl } from "@finnberry/utils";
import { Play, Droplets, Cloud, CloudRain } from "lucide-react";

type LogType = "sleep" | "breast" | "bottle" | "diaper";

interface LogModalProps {
  childId: string;
  type: LogType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTimeForInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

function formatTimeDisplay(date: Date): string {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return isToday ? `Today, ${timeStr}` : date.toLocaleDateString([], { month: "short", day: "numeric" }) + `, ${timeStr}`;
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
      </DialogContent>
    </Dialog>
  );
}

function TimeRow({
  label,
  value,
  onChange,
  placeholder = "Set time"
}: {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center justify-between py-4 px-6 border-b border-border">
      <span className="text-muted-foreground">{label}</span>
      {editing ? (
        <input
          type="datetime-local"
          className="bg-transparent border-none text-right text-primary focus:outline-none"
          value={value ? formatTimeForInput(value) : ""}
          onChange={(e) => {
            onChange(e.target.value ? new Date(e.target.value) : null);
          }}
          onBlur={() => setEditing(false)}
          autoFocus
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-primary hover:underline"
        >
          {value ? formatTimeDisplay(value) : placeholder}
        </button>
      )}
    </div>
  );
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-border mx-6 my-4">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SleepModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const sleepTimer = useTimer(childId, "sleep");

  const [sleepType, setSleepType] = useState<"NAP" | "NIGHT">("NAP");
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);

  const startSleep = trpc.sleep.start.useMutation({
    onSuccess: (result) => {
      utils.sleep.getActive.invalidate({ childId });
      sleepTimer.start({ sleepType });
      sleepTimer.update({ recordId: result.id });
      toast({ title: "Sleep timer started" });
      onClose();
    },
  });

  const logSleep = trpc.sleep.log.useMutation({
    onSuccess: () => {
      utils.sleep.list.invalidate();
      utils.sleep.summary.invalidate({ childId });
      toast({ title: "Sleep recorded" });
      onClose();
    },
  });

  const handleAction = () => {
    if (endTime && startTime) {
      // Log completed sleep
      logSleep.mutate({
        childId,
        sleepType,
        startTime,
        endTime,
      });
    } else if (startTime) {
      // Start timer
      startSleep.mutate({ childId, sleepType, startTime });
    }
  };

  const isLoading = startSleep.isPending || logSleep.isPending;
  const hasEndTime = !!endTime;

  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Add Sleep</DialogTitle>
      </DialogHeader>

      <ToggleGroup
        options={[
          { value: "NAP", label: "Nap" },
          { value: "NIGHT", label: "Night" },
        ]}
        value={sleepType}
        onChange={setSleepType}
      />

      <TimeRow label="Start Time" value={startTime} onChange={setStartTime} />
      <TimeRow label="End Time" value={endTime} onChange={setEndTime} placeholder="Set time" />

      <div className="p-6 pt-8 flex justify-center">
        {hasEndTime ? (
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={handleAction}
            disabled={isLoading || !startTime}
          >
            Save
          </Button>
        ) : (
          <button
            onClick={handleAction}
            disabled={isLoading || !startTime}
            className="w-32 h-32 rounded-full bg-primary/20 border-2 border-dashed border-primary flex flex-col items-center justify-center gap-2 hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            <Play className="h-8 w-8 text-primary" />
            <span className="text-primary font-semibold">START</span>
          </button>
        )}
      </div>
    </>
  );
}

function BreastModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const feedingTimer = useTimer(childId, "feeding");

  const [side, setSide] = useState<"LEFT" | "RIGHT" | "BOTH">("LEFT");
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);

  const startBreastfeeding = trpc.feeding.startBreastfeeding.useMutation({
    onSuccess: (result) => {
      utils.feeding.getActive.invalidate({ childId });
      feedingTimer.start({ feedingSide: side });
      feedingTimer.update({ recordId: result.id });
      toast({ title: "Feeding timer started" });
      onClose();
    },
  });

  const logBreastfeeding = trpc.feeding.logBreastfeeding.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.feeding.summary.invalidate({ childId });
      toast({ title: "Breastfeeding recorded" });
      onClose();
    },
  });

  const handleAction = () => {
    if (endTime && startTime) {
      logBreastfeeding.mutate({
        childId,
        side,
        startTime,
        endTime,
      });
    } else if (startTime) {
      startBreastfeeding.mutate({ childId, side, startTime });
    }
  };

  const isLoading = startBreastfeeding.isPending || logBreastfeeding.isPending;
  const hasEndTime = !!endTime;

  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Add Breastfeeding</DialogTitle>
      </DialogHeader>

      <ToggleGroup
        options={[
          { value: "LEFT", label: "Left" },
          { value: "RIGHT", label: "Right" },
          { value: "BOTH", label: "Both" },
        ]}
        value={side}
        onChange={setSide}
      />

      <TimeRow label="Start Time" value={startTime} onChange={setStartTime} />
      <TimeRow label="End Time" value={endTime} onChange={setEndTime} placeholder="Set time" />

      <div className="p-6 pt-8 flex justify-center">
        {hasEndTime ? (
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={handleAction}
            disabled={isLoading || !startTime}
          >
            Save
          </Button>
        ) : (
          <button
            onClick={handleAction}
            disabled={isLoading || !startTime}
            className="w-32 h-32 rounded-full bg-primary/20 border-2 border-dashed border-primary flex flex-col items-center justify-center gap-2 hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            <Play className="h-8 w-8 text-primary" />
            <span className="text-primary font-semibold">START</span>
          </button>
        )}
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

      <ToggleGroup
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

function DiaperModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [time, setTime] = useState<Date | null>(new Date());
  const [diaperType, setDiaperType] = useState<"WET" | "DIRTY" | "BOTH" | "DRY">("WET");

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
    });
  };

  const typeOptions = [
    { value: "WET" as const, label: "Wet", icon: Droplets },
    { value: "DIRTY" as const, label: "Dirty", icon: Cloud },
    { value: "BOTH" as const, label: "Mixed", icon: CloudRain },
  ];

  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <DialogTitle className="text-center">Add Diaper</DialogTitle>
      </DialogHeader>

      <TimeRow label="Time" value={time} onChange={setTime} />

      <div className="px-6 py-6">
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

      <div className="p-6 pt-0">
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
