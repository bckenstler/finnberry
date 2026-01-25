"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTime, formatDuration, formatDate, calculateDurationMinutes } from "@finnberry/utils";
import Link from "next/link";
import { ArrowLeft, Moon, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function SleepPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  useRealtimeSync(childId);

  const { data: child } = trpc.child.get.useQuery({ id: childId });
  const { data: todayRecords } = trpc.sleep.list.useQuery({
    childId,
    period: "today",
  });
  const { data: weekRecords } = trpc.sleep.list.useQuery({
    childId,
    period: "week",
  });
  const { data: summary } = trpc.sleep.summary.useQuery({
    childId,
    period: "today",
  });

  const deleteSleep = trpc.sleep.delete.useMutation({
    onSuccess: () => {
      utils.sleep.list.invalidate({ childId });
      utils.sleep.summary.invalidate({ childId });
      toast({ title: "Sleep record deleted" });
    },
  });

  const logSleep = trpc.sleep.log.useMutation({
    onSuccess: () => {
      utils.sleep.list.invalidate({ childId });
      utils.sleep.summary.invalidate({ childId });
      toast({ title: "Sleep logged" });
    },
  });

  const [logOpen, setLogOpen] = useState(false);
  const [logData, setLogData] = useState({
    startTime: "",
    endTime: "",
    sleepType: "NAP" as "NAP" | "NIGHT",
  });

  const handleLogSleep = () => {
    if (logData.startTime && logData.endTime) {
      logSleep.mutate({
        childId,
        startTime: new Date(logData.startTime),
        endTime: new Date(logData.endTime),
        sleepType: logData.sleepType,
      });
      setLogOpen(false);
      setLogData({ startTime: "", endTime: "", sleepType: "NAP" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/${childId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Sleep</h1>
            <p className="text-sm text-muted-foreground">{child?.name}</p>
          </div>
        </div>
        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogTrigger asChild>
            <Button>Log Sleep</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Past Sleep</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sleep Type</Label>
                <Select
                  value={logData.sleepType}
                  onValueChange={(v) =>
                    setLogData((d) => ({ ...d, sleepType: v as "NAP" | "NIGHT" }))
                  }
                >
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
                  value={logData.startTime}
                  onChange={(e) =>
                    setLogData((d) => ({ ...d, startTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={logData.endTime}
                  onChange={(e) =>
                    setLogData((d) => ({ ...d, endTime: e.target.value }))
                  }
                />
              </div>
              <Button className="w-full" onClick={handleLogSleep}>
                Log Sleep
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {formatDuration(summary.totalMinutes)}
                </p>
                <p className="text-sm text-muted-foreground">Total Sleep</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.napCount}</p>
                <p className="text-sm text-muted-foreground">Naps</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.nightCount}</p>
                <p className="text-sm text-muted-foreground">Night</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-2">
          {todayRecords?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No sleep recorded today
            </p>
          )}
          {todayRecords?.map((record) => (
            <SleepRecordCard
              key={record.id}
              record={record}
              onDelete={() => deleteSleep.mutate({ id: record.id })}
            />
          ))}
        </TabsContent>

        <TabsContent value="week" className="space-y-2">
          {weekRecords?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No sleep recorded this week
            </p>
          )}
          {weekRecords?.map((record) => (
            <SleepRecordCard
              key={record.id}
              record={record}
              onDelete={() => deleteSleep.mutate({ id: record.id })}
              showDate
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SleepRecordCard({
  record,
  onDelete,
  showDate = false,
}: {
  record: {
    id: string;
    startTime: Date;
    endTime: Date | null;
    sleepType: string;
    quality: number | null;
  };
  onDelete: () => void;
  showDate?: boolean;
}) {
  const duration = record.endTime
    ? calculateDurationMinutes(record.startTime, record.endTime)
    : null;

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Moon className="h-5 w-5 text-indigo-500" />
          <div>
            <p className="font-medium">
              {record.sleepType === "NAP" ? "Nap" : "Night Sleep"}
            </p>
            <p className="text-sm text-muted-foreground">
              {showDate && `${formatDate(record.startTime)} `}
              {formatTime(record.startTime)}
              {record.endTime && ` - ${formatTime(record.endTime)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-lg">
              {duration ? formatDuration(duration) : "In progress"}
            </p>
            {record.quality && (
              <p className="text-xs text-muted-foreground">
                Quality: {record.quality}/5
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
