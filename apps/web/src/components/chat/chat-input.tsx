"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ImagePlus, Send, Square, X } from "lucide-react";
import { CHAT_IMAGES_MAX_COUNT, type ChatImage } from "@finnberry/schemas";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { chatImageUrl, prepareChatImage } from "@/lib/image";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, images: ChatImage[]) => void;
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
  const [images, setImages] = useState<ChatImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const canSend = message.trim() !== "" || images.length > 0;
  const canAttach = images.length < CHAT_IMAGES_MAX_COUNT && !disabled && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend && !disabled && !isLoading) {
      onSend(message.trim(), images);
      setMessage("");
      setImages([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFilesPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Reset so picking the same file again still fires a change event.
    e.target.value = "";

    const freeSlots = CHAT_IMAGES_MAX_COUNT - images.length;
    if (files.length > freeSlots) {
      toast({ title: `You can attach up to ${CHAT_IMAGES_MAX_COUNT} images` });
    }

    for (const file of files.slice(0, freeSlots)) {
      try {
        const image = await prepareChatImage(file);
        setImages((current) => [...current, image].slice(0, CHAT_IMAGES_MAX_COUNT));
      } catch (error) {
        toast({
          title: "Could not attach image",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((current) => current.filter((_, position) => position !== index));
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-2", className)}>
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <li key={index} className="relative">
              <Image
                src={chatImageUrl(image)}
                alt={`Attachment ${index + 1}`}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-lg border border-input object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove attachment {index + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFilesPicked}
          data-testid="chat-image-input"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={!canAttach}
          onClick={() => fileInputRef.current?.click()}
          className="h-12 w-12 shrink-0 rounded-xl"
        >
          <ImagePlus className="h-4 w-4" />
          <span className="sr-only">Attach image</span>
        </Button>
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
            disabled={!canSend || disabled}
            className="h-12 w-12 shrink-0 rounded-xl"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        )}
      </div>
    </form>
  );
}
