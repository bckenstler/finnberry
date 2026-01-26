"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DayView } from "@/components/reports/day-view";
import { WeekView } from "@/components/reports/week-view";
import { ListView } from "@/components/reports/list-view";

interface ReportsViewProps {
  childId: string;
}

export function ReportsView({ childId }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState("day");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="day">Day</TabsTrigger>
        <TabsTrigger value="week">Week</TabsTrigger>
        <TabsTrigger value="list">List</TabsTrigger>
      </TabsList>

      <TabsContent value="day">
        <DayView childId={childId} />
      </TabsContent>

      <TabsContent value="week">
        <WeekView childId={childId} />
      </TabsContent>

      <TabsContent value="list">
        <ListView childId={childId} />
      </TabsContent>
    </Tabs>
  );
}
