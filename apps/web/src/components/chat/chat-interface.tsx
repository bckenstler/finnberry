"use client";

import { useRef, useEffect } from "react";
import { ChatMessage, type ToolCall, type ContentBlock } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ModelId } from "@/hooks/use-chat";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentBlocks?: ContentBlock[];
  isStreaming?: boolean;
}

const MODEL_OPTIONS: { value: ModelId; label: string }[] = [
  { value: "haiku", label: "Haiku" },
  { value: "sonnet", label: "Sonnet 4.5" },
  { value: "opus", label: "Opus 4.5" },
];

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  model?: ModelId;
  onModelChange?: (model: ModelId) => void;
  className?: string;
}

export function ChatInterface({
  messages,
  onSendMessage,
  onStop,
  isLoading,
  disabled,
  model = "sonnet",
  onModelChange,
  className,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pb-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">👶</div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Chat with Finnberry
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask me to log activities, check summaries, or help you track your
              baby&apos;s day. Try saying &quot;What did the baby do today?&quot; or
              &quot;Log a wet diaper&quot;.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                contentBlocks={message.contentBlocks}
                isStreaming={message.isStreaming}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <span className="text-xs">AI</span>
                </div>
                <TypingIndicator />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t bg-background p-4 space-y-3">
        <ChatInput
          onSend={onSendMessage}
          onStop={onStop}
          disabled={disabled}
          isLoading={isLoading}
          placeholder="Ask Finnberry anything..."
        />
        {onModelChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Model:</span>
            <Select
              value={model}
              onValueChange={(value) => onModelChange(value as ModelId)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
