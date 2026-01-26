"use client";

import { useState } from "react";

function formatTimeForInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

function formatTimeDisplay(date: Date): string {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return isToday ? `Today, ${timeStr}` : date.toLocaleDateString([], { month: "short", day: "numeric" }) + `, ${timeStr}`;
}

interface TimeRowProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
}

export function TimeRow({
  label,
  value,
  onChange,
  placeholder = "Set time"
}: TimeRowProps) {
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
