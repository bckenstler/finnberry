"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { useTimer } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { mlToOz, ozToMl } from "@finnberry/utils";
import { Moon, Baby, Droplets, Plus, Play, Square } from "lucide-react";

type BottleContentType = "FORMULA" | "BREAST_MILK";

interface QuickLogGridProps {
  childId: string;
}

export function QuickLogGrid({ childId }: QuickLogGridProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const sleepTimer = useTimer(childId, "sleep");
  const feedingTimer = useTimer(childId, "feeding");

  const startSleep = trpc.sleep.start.useMutation({
    onSuccess: () => {
      utils.sleep.getActive.invalidate({ childId });
      toast({ title: "Sleep timer started" });
    },
  });

  const endSleep = trpc.sleep.end.useMutation({
    onSuccess: () => {
      utils.sleep.list.invalidate();
      utils.sleep.getActive.invalidate({ childId });
      utils.sleep.summary.invalidate({ childId });
      toast({ title: "Sleep recorded" });
    },
  });

  const startBreastfeeding = trpc.feeding.startBreastfeeding.useMutation({
    onSuccess: () => {
      utils.feeding.getActive.invalidate({ childId });
      toast({ title: "Feeding timer started" });
    },
  });

  const endBreastfeeding = trpc.feeding.endBreastfeeding.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.feeding.getActive.invalidate({ childId });
      utils.feeding.summary.invalidate({ childId });
      toast({ title: "Feeding recorded" });
    },
  });

  const logDiaper = trpc.diaper.log.useMutation({
    onSuccess: () => {
      utils.diaper.list.invalidate();
      utils.diaper.summary.invalidate({ childId });
      toast({ title: "Diaper change logged" });
    },
  });

  const logBottle = trpc.feeding.logBottle.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.feeding.summary.invalidate({ childId });
      toast({ title: "Bottle feeding logged" });
    },
  });

  const handleSleepToggle = async (sleepType: "NAP" | "NIGHT") => {
    if (sleepTimer.isRunning) {
      const timer = sleepTimer.stop();
      if (timer?.recordId) {
        await endSleep.mutateAsync({ id: timer.recordId });
      }
    } else {
      const result = await startSleep.mutateAsync({ childId, sleepType });
      sleepTimer.start({ sleepType });
      sleepTimer.update({ recordId: result.id });
    }
  };

  const handleFeedingToggle = async (side: "LEFT" | "RIGHT") => {
    if (feedingTimer.isRunning) {
      const timer = feedingTimer.stop();
      if (timer?.recordId) {
        await endBreastfeeding.mutateAsync({ id: timer.recordId });
      }
    } else {
      const result = await startBreastfeeding.mutateAsync({ childId, side });
      feedingTimer.start({ feedingSide: side });
      feedingTimer.update({ recordId: result.id });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SleepButton
            isRunning={sleepTimer.isRunning}
            elapsed={sleepTimer.elapsedFormatted}
            onToggle={handleSleepToggle}
          />

          <FeedingButton
            isRunning={feedingTimer.isRunning}
            elapsed={feedingTimer.elapsedFormatted}
            side={feedingTimer.timer?.metadata?.feedingSide}
            onToggle={handleFeedingToggle}
          />

          <BottleDialog childId={childId} onLog={logBottle.mutateAsync} />

          <DiaperButtons childId={childId} onLog={logDiaper.mutateAsync} />
        </div>
      </CardContent>
    </Card>
  );
}

function SleepButton({
  isRunning,
  elapsed,
  onToggle,
}: {
  isRunning: boolean;
  elapsed: string;
  onToggle: (type: "NAP" | "NIGHT") => void;
}) {
  const [open, setOpen] = useState(false);

  if (isRunning) {
    return (
      <Button
        variant="destructive"
        className="h-20 flex-col gap-1"
        onClick={() => onToggle("NAP")}
      >
        <Square className="h-5 w-5" />
        <span className="text-xs">{elapsed}</span>
        <span className="text-xs">Stop Sleep</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-20 flex-col gap-1">
          <Moon className="h-5 w-5" />
          <span className="text-xs">Sleep</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Sleep Timer</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            onClick={() => {
              onToggle("NAP");
              setOpen(false);
            }}
          >
            <Moon className="mr-2 h-4 w-4" />
            Nap
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              onToggle("NIGHT");
              setOpen(false);
            }}
          >
            <Moon className="mr-2 h-4 w-4" />
            Night Sleep
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeedingButton({
  isRunning,
  elapsed,
  side,
  onToggle,
}: {
  isRunning: boolean;
  elapsed: string;
  side?: "LEFT" | "RIGHT" | "BOTH";
  onToggle: (side: "LEFT" | "RIGHT") => void;
}) {
  const [open, setOpen] = useState(false);

  if (isRunning) {
    return (
      <Button
        variant="destructive"
        className="h-20 flex-col gap-1"
        onClick={() => onToggle("LEFT")}
      >
        <Square className="h-5 w-5" />
        <span className="text-xs">{elapsed}</span>
        <span className="text-xs">Stop {side}</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-20 flex-col gap-1">
          <Baby className="h-5 w-5" />
          <span className="text-xs">Breast</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Breastfeeding</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            onClick={() => {
              onToggle("LEFT");
              setOpen(false);
            }}
          >
            Left Side
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              onToggle("RIGHT");
              setOpen(false);
            }}
          >
            Right Side
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BottleDialog({
  childId,
  onLog,
}: {
  childId: string;
  onLog: (data: { childId: string; startTime: Date; amountMl: number; bottleContentType?: BottleContentType }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("120");
  const [unit, setUnit] = useState<"ml" | "oz">("ml");
  const [contentType, setContentType] = useState<BottleContentType>("FORMULA");

  const presetsMl = [60, 90, 120, 150, 180];
  const presetsOz = [2, 3, 4, 5, 6];

  const displayAmount = unit === "ml" ? amount : String(mlToOz(parseInt(amount, 10) || 0));

  const handleAmountChange = (value: string) => {
    const numValue = parseInt(value, 10) || 0;
    if (unit === "oz") {
      setAmount(String(ozToMl(numValue)));
    } else {
      setAmount(value);
    }
  };

  const handlePresetClick = (value: number) => {
    if (unit === "oz") {
      setAmount(String(ozToMl(value)));
    } else {
      setAmount(String(value));
    }
  };

  const handleSubmit = async () => {
    await onLog({
      childId,
      startTime: new Date(),
      amountMl: parseInt(amount, 10),
      bottleContentType: contentType,
    });
    setOpen(false);
    setAmount("120");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-20 flex-col gap-1">
          <Baby className="h-5 w-5" />
          <span className="text-xs">Bottle</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Bottle Feeding</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select value={contentType} onValueChange={(v) => setContentType(v as BottleContentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FORMULA">Formula</SelectItem>
                <SelectItem value="BREAST_MILK">Breast Milk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex gap-1">
                <Button
                  variant={unit === "ml" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnit("ml")}
                >
                  ml
                </Button>
                <Button
                  variant={unit === "oz" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnit("oz")}
                >
                  oz
                </Button>
              </div>
            </div>
            <Input
              id="amount"
              type="number"
              value={displayAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              min="0"
              max={unit === "ml" ? "500" : "17"}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(unit === "ml" ? presetsMl : presetsOz).map((value) => (
              <Button
                key={value}
                variant={
                  (unit === "ml" && amount === String(value)) ||
                  (unit === "oz" && amount === String(ozToMl(value)))
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => handlePresetClick(value)}
              >
                {value}{unit}
              </Button>
            ))}
          </div>
          <Button className="w-full" onClick={handleSubmit}>
            Log Bottle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiaperButtons({
  childId,
  onLog,
}: {
  childId: string;
  onLog: (data: { childId: string; diaperType: "WET" | "DIRTY" | "BOTH" }) => Promise<unknown>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="h-9 text-xs"
        onClick={() => onLog({ childId, diaperType: "WET" })}
      >
        <Droplets className="mr-1 h-3 w-3" />
        Wet
      </Button>
      <Button
        variant="outline"
        className="h-9 text-xs"
        onClick={() => onLog({ childId, diaperType: "DIRTY" })}
      >
        <Droplets className="mr-1 h-3 w-3" />
        Dirty
      </Button>
    </div>
  );
}
