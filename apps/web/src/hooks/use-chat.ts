"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, ToolCall, ContentBlock } from "@/components/chat";

export type ModelId = "haiku" | "sonnet" | "opus";

interface UseChatOptions {
  childId: string;
  onError?: (error: Error) => void;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  model: ModelId;
  setModel: (model: ModelId) => void;
  sendMessage: (content: string) => Promise<void>;
  stop: () => void;
  clearMessages: () => void;
}

export function useChat({ childId, onError }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [model, setModel] = useState<ModelId>("sonnet");
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Cancel any existing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Prepare conversation history (last 10 messages for context)
      const conversationHistory = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            childId,
            message: content,
            model,
            conversationHistory,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        const assistantMessageId = `assistant-${Date.now()}`;

        // Track content blocks in order for interleaved rendering
        const contentBlocks: ContentBlock[] = [];
        const toolCallsById: Map<string, ToolCall> = new Map();
        let currentTextBlockIndex = -1;

        // Helper to update the message state
        const updateMessage = () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: contentBlocks
                      .filter((b): b is { type: "text"; text: string } => b.type === "text")
                      .map((b) => b.text)
                      .join(""),
                    contentBlocks: [...contentBlocks],
                  }
                : msg
            )
          );
        };

        // Add initial assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            contentBlocks: [],
            isStreaming: true,
          },
        ]);

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            if (!data) continue;

            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case "text_delta":
                  // Check if current block is a text block
                  if (currentTextBlockIndex === -1 || contentBlocks[currentTextBlockIndex]?.type !== "text") {
                    // Create new text block
                    currentTextBlockIndex = contentBlocks.length;
                    contentBlocks.push({ type: "text", text: event.text });
                  } else {
                    // Append to existing text block
                    const block = contentBlocks[currentTextBlockIndex];
                    if (block.type === "text") {
                      block.text += event.text;
                    }
                  }
                  updateMessage();
                  break;

                case "tool_use_start": {
                  // End current text block tracking (new tool means new text block after)
                  currentTextBlockIndex = -1;

                  const toolCall: ToolCall = {
                    id: event.id,
                    name: event.name,
                    input: {},
                    status: "pending",
                  };
                  toolCallsById.set(event.id, toolCall);
                  contentBlocks.push({ type: "tool", tool: toolCall });
                  updateMessage();
                  break;
                }

                case "tool_executing":
                  if (toolCallsById.has(event.id)) {
                    const toolCall = toolCallsById.get(event.id)!;
                    toolCall.input = event.input;
                    toolCall.status = "running";
                    updateMessage();
                  }
                  break;

                case "tool_result":
                  if (toolCallsById.has(event.id)) {
                    const toolCall = toolCallsById.get(event.id)!;
                    toolCall.output = event.result;
                    toolCall.status = "success";
                    updateMessage();
                  }
                  break;

                case "tool_error":
                  if (toolCallsById.has(event.id)) {
                    const toolCall = toolCallsById.get(event.id)!;
                    toolCall.output = event.error;
                    toolCall.status = "error";
                    updateMessage();
                  }
                  break;

                case "error":
                  throw new Error(event.error || "Unknown error");
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              if (parseError instanceof SyntaxError) {
                console.debug("Failed to parse SSE data:", data);
              } else {
                throw parseError;
              }
            }
          }
        }

        // Finalize message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled, don't treat as error
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);

        // Remove the streaming message if there was an error
        setMessages((prev) =>
          prev.filter((msg) => !msg.isStreaming || msg.role === "user")
        );
      } finally {
        setIsLoading(false);
      }
    },
    [childId, isLoading, messages, model, onError]
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    // Mark any streaming messages as complete
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    model,
    setModel,
    sendMessage,
    stop,
    clearMessages,
  };
}
