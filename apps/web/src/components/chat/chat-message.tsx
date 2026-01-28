"use client";

import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolExecution } from "./tool-execution";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "running" | "success" | "error";
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool"; tool: ToolCall };

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string; // For user messages (simple text)
  contentBlocks?: ContentBlock[]; // For assistant messages (interleaved)
  isStreaming?: boolean;
  className?: string;
}

export function ChatMessage({
  role,
  content,
  contentBlocks,
  isStreaming,
  className,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 py-4",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {isUser ? (
          // User message - simple text bubble
          <div className="rounded-2xl px-4 py-2 bg-primary text-primary-foreground">
            <div className="whitespace-pre-wrap text-sm">{content}</div>
          </div>
        ) : (
          // Assistant message - interleaved content blocks
          <>
            {contentBlocks && contentBlocks.length > 0 ? (
              contentBlocks.map((block, index) => {
                if (block.type === "text") {
                  return block.text ? (
                    <div
                      key={`text-${index}`}
                      className="rounded-2xl px-4 py-2 bg-muted text-foreground"
                    >
                      <div className="whitespace-pre-wrap text-sm">
                        {block.text}
                        {isStreaming && index === contentBlocks.length - 1 && (
                          <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
                        )}
                      </div>
                    </div>
                  ) : null;
                } else if (block.type === "tool") {
                  return (
                    <ToolExecution
                      key={block.tool.id}
                      toolName={block.tool.name}
                      input={block.tool.input}
                      output={block.tool.output}
                      status={block.tool.status}
                      className="w-full"
                    />
                  );
                }
                return null;
              })
            ) : content ? (
              // Fallback for simple content
              <div className="rounded-2xl px-4 py-2 bg-muted text-foreground">
                <div className="whitespace-pre-wrap text-sm">
                  {content}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
                  )}
                </div>
              </div>
            ) : isStreaming ? (
              // Show cursor while waiting for first content
              <div className="rounded-2xl px-4 py-2 bg-muted text-foreground">
                <span className="inline-block w-2 h-4 bg-current animate-pulse" />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
