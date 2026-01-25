"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/provider";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTime, formatDate } from "@finnberry/utils";
import Link from "next/link";
import { ArrowLeft, Droplets, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DiapersPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  useRealtimeSync(childId);

  const { data: child } = trpc.child.get.useQuery({ id: childId });
  const { data: todayRecords } = trpc.diaper.list.useQuery({
    childId,
    period: "today",
  });
  const { data: weekRecords } = trpc.diaper.list.useQuery({
    childId,
    period: "week",
  });
  const { data: summary } = trpc.diaper.summary.useQuery({
    childId,
    period: "today",
  });

  const logDiaper = trpc.diaper.log.useMutation({
    onSuccess: () => {
      utils.diaper.list.invalidate({ childId });
      utils.diaper.summary.invalidate({ childId });
      toast({ title: "Diaper logged" });
    },
  });

  const deleteDiaper = trpc.diaper.delete.useMutation({
    onSuccess: () => {
      utils.diaper.list.invalidate({ childId });
      utils.diaper.summary.invalidate({ childId });
      toast({ title: "Diaper record deleted" });
    },
  });

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
            <h1 className="text-2xl font-bold">Diapers</h1>
            <p className="text-sm text-muted-foreground">{child?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => logDiaper.mutate({ childId, diaperType: "WET" })}
          >
            Log Wet
          </Button>
          <Button
            variant="outline"
            onClick={() => logDiaper.mutate({ childId, diaperType: "DIRTY" })}
          >
            Log Dirty
          </Button>
          <Button
            onClick={() => logDiaper.mutate({ childId, diaperType: "BOTH" })}
          >
            Log Both
          </Button>
        </div>
      </div>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{summary.wetCount}</p>
                <p className="text-sm text-muted-foreground">Wet</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.dirtyCount}</p>
                <p className="text-sm text-muted-foreground">Dirty</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalChanges}</p>
                <p className="text-sm text-muted-foreground">Total</p>
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
              No diapers recorded today
            </p>
          )}
          {todayRecords?.map((record) => (
            <DiaperRecordCard
              key={record.id}
              record={record}
              onDelete={() => deleteDiaper.mutate({ id: record.id })}
            />
          ))}
        </TabsContent>

        <TabsContent value="week" className="space-y-2">
          {weekRecords?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No diapers recorded this week
            </p>
          )}
          {weekRecords?.map((record) => (
            <DiaperRecordCard
              key={record.id}
              record={record}
              onDelete={() => deleteDiaper.mutate({ id: record.id })}
              showDate
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiaperRecordCard({
  record,
  onDelete,
  showDate = false,
}: {
  record: {
    id: string;
    time: Date;
    diaperType: string;
    color: string | null;
    consistency: string | null;
  };
  onDelete: () => void;
  showDate?: boolean;
}) {
  const getLabel = () => {
    switch (record.diaperType) {
      case "WET":
        return "Wet";
      case "DIRTY":
        return "Dirty";
      case "BOTH":
        return "Wet & Dirty";
      case "DRY":
        return "Dry";
      default:
        return record.diaperType;
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Droplets className="h-5 w-5 text-blue-500" />
          <div>
            <p className="font-medium">{getLabel()}</p>
            <p className="text-sm text-muted-foreground">
              {showDate && `${formatDate(record.time)} `}
              {formatTime(record.time)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(record.color || record.consistency) && (
            <p className="text-sm text-muted-foreground">
              {[
                record.color?.toLowerCase(),
                record.consistency?.toLowerCase(),
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
