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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { mlToOz, ozToMl } from "@finnberry/utils";

type LogType = "sleep" | "breast" | "bottle" | "diaper";

interface LogModalProps {
  childId: string;
  type: LogType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogModal({ childId, type, open, onOpenChange }: LogModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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

function SleepModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const sleepTimer = useTimer(childId, "sleep");

  const [sleepType, setSleepType] = useState<"NAP" | "NIGHT">("NAP");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

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

  const handleStartTimer = (type: "NAP" | "NIGHT") => {
    startSleep.mutate({ childId, sleepType: type });
  };

  const handleLogDirect = () => {
    if (!startTime) return;
    logSleep.mutate({
      childId,
      sleepType,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log Sleep</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="timer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timer">Start Timer</TabsTrigger>
          <TabsTrigger value="direct">Enter Times</TabsTrigger>
        </TabsList>
        <TabsContent value="timer" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Start tracking sleep now
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              onClick={() => handleStartTimer("NAP")}
              disabled={startSleep.isPending}
            >
              Start Nap
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => handleStartTimer("NIGHT")}
              disabled={startSleep.isPending}
            >
              Start Night
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="direct" className="space-y-4">
          <div className="space-y-2">
            <Label>Sleep Type</Label>
            <Select value={sleepType} onValueChange={(v) => setSleepType(v as "NAP" | "NIGHT")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NAP">Nap</SelectItem>
                <SelectItem value="NIGHT">Night Sleep</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Time (optional)</Label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleLogDirect}
            disabled={!startTime || logSleep.isPending}
          >
            Log Sleep
          </Button>
        </TabsContent>
      </Tabs>
    </>
  );
}

function BreastModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const feedingTimer = useTimer(childId, "feeding");

  const [side, setSide] = useState<"LEFT" | "RIGHT" | "BOTH">("LEFT");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

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

  const handleStartTimer = (selectedSide: "LEFT" | "RIGHT") => {
    setSide(selectedSide);
    startBreastfeeding.mutate({ childId, side: selectedSide });
  };

  const handleLogDirect = () => {
    if (!startTime) return;
    logBreastfeeding.mutate({
      childId,
      side,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log Breastfeeding</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="timer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timer">Start Timer</TabsTrigger>
          <TabsTrigger value="direct">Enter Times</TabsTrigger>
        </TabsList>
        <TabsContent value="timer" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Start tracking breastfeeding now
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              onClick={() => handleStartTimer("LEFT")}
              disabled={startBreastfeeding.isPending}
            >
              Left Side
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => handleStartTimer("RIGHT")}
              disabled={startBreastfeeding.isPending}
            >
              Right Side
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="direct" className="space-y-4">
          <div className="space-y-2">
            <Label>Side</Label>
            <Select value={side} onValueChange={(v) => setSide(v as "LEFT" | "RIGHT" | "BOTH")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEFT">Left</SelectItem>
                <SelectItem value="RIGHT">Right</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Time (optional)</Label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleLogDirect}
            disabled={!startTime || logBreastfeeding.isPending}
          >
            Log Breastfeeding
          </Button>
        </TabsContent>
      </Tabs>
    </>
  );
}

function BottleModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [amount, setAmount] = useState("120");
  const [unit, setUnit] = useState<"ml" | "oz">("ml");
  const [contentType, setContentType] = useState<"FORMULA" | "BREAST_MILK">("FORMULA");

  const logBottle = trpc.feeding.logBottle.useMutation({
    onSuccess: () => {
      utils.feeding.list.invalidate();
      utils.feeding.summary.invalidate({ childId });
      toast({ title: "Bottle feeding logged" });
      onClose();
    },
  });

  const displayAmount = unit === "ml" ? amount : String(mlToOz(parseInt(amount, 10) || 0));

  const presetsMl = [60, 90, 120, 150, 180];
  const presetsOz = [2, 3, 4, 5, 6];

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

  const handleUnitToggle = (newUnit: "ml" | "oz") => {
    setUnit(newUnit);
  };

  const handleSubmit = () => {
    logBottle.mutate({
      childId,
      startTime: new Date(),
      amountMl: parseInt(amount, 10),
      bottleContentType: contentType,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log Bottle Feeding</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={(v) => setContentType(v as "FORMULA" | "BREAST_MILK")}>
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
            <Label>Amount</Label>
            <div className="flex gap-1">
              <Button
                variant={unit === "ml" ? "default" : "outline"}
                size="sm"
                onClick={() => handleUnitToggle("ml")}
              >
                ml
              </Button>
              <Button
                variant={unit === "oz" ? "default" : "outline"}
                size="sm"
                onClick={() => handleUnitToggle("oz")}
              >
                oz
              </Button>
            </div>
          </div>
          <Input
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

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={logBottle.isPending}
        >
          Log Bottle
        </Button>
      </div>
    </>
  );
}

function DiaperModal({ childId, onClose }: { childId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [diaperType, setDiaperType] = useState<"WET" | "DIRTY" | "BOTH">("WET");
  const [color, setColor] = useState<string>("");
  const [size, setSize] = useState<string>("");

  const logDiaper = trpc.diaper.log.useMutation({
    onSuccess: () => {
      utils.diaper.list.invalidate();
      utils.diaper.summary.invalidate({ childId });
      toast({ title: "Diaper change logged" });
      onClose();
    },
  });

  const handleSubmit = () => {
    logDiaper.mutate({
      childId,
      diaperType,
      color: color as "YELLOW" | "GREEN" | "BROWN" | "BLACK" | "RED" | "WHITE" | "OTHER" | undefined || undefined,
      size: size as "NEWBORN" | "SIZE_1" | "SIZE_2" | "SIZE_3" | "SIZE_4" | "SIZE_5" | "SIZE_6" | undefined || undefined,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log Diaper Change</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Diaper Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["WET", "DIRTY", "BOTH"] as const).map((type) => (
              <Button
                key={type}
                variant={diaperType === type ? "default" : "outline"}
                onClick={() => setDiaperType(type)}
              >
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color (optional)</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger>
              <SelectValue placeholder="Select color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="YELLOW">Yellow</SelectItem>
              <SelectItem value="GREEN">Green</SelectItem>
              <SelectItem value="BROWN">Brown</SelectItem>
              <SelectItem value="BLACK">Black</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Size (optional)</Label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEWBORN">Newborn</SelectItem>
              <SelectItem value="SIZE_1">Size 1</SelectItem>
              <SelectItem value="SIZE_2">Size 2</SelectItem>
              <SelectItem value="SIZE_3">Size 3</SelectItem>
              <SelectItem value="SIZE_4">Size 4</SelectItem>
              <SelectItem value="SIZE_5">Size 5</SelectItem>
              <SelectItem value="SIZE_6">Size 6</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={logDiaper.isPending}
        >
          Log Diaper
        </Button>
      </div>
    </>
  );
}
