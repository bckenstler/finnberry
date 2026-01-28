"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  onSend,
  onStop,
  disabled,
  isLoading,
  placeholder = "Type a message...",
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !isLoading) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12",
            "text-sm placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[48px] max-h-[200px]"
          )}
        />
      </div>
      {isLoading ? (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          onClick={onStop}
          className="h-12 w-12 shrink-0 rounded-xl"
        >
          <Square className="h-4 w-4" />
          <span className="sr-only">Stop</span>
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className="h-12 w-12 shrink-0 rounded-xl"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      )}
    </form>
  );
}
