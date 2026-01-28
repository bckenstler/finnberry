"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ToolExecutionProps {
  toolName: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "running" | "success" | "error";
  className?: string;
}

export function ToolExecution({
  toolName,
  input,
  output,
  status,
  className,
}: ToolExecutionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatToolName = (name: string) => {
    // Remove mcp__finnberry__ prefix if present
    const cleanName = name.replace(/^mcp__finnberry__/, "");
    // Convert kebab-case to title case
    return cleanName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const StatusIcon = () => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/50 text-sm",
        className
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 px-3 py-2 h-auto font-normal"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left truncate">
          {formatToolName(toolName)}
        </span>
        <StatusIcon />
      </Button>

      {isExpanded && (
        <div className="border-t px-3 py-2 space-y-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Input:
            </div>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {output && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Output:
              </div>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
