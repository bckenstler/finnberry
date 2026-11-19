"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { chatModelSchema, type ChatModel } from "@finnberry/schemas";

const allowedModelsResponseSchema = z.object({
  models: z.array(chatModelSchema).min(1),
});

// The models this deployment offers in chat, or undefined until known. The
// server enforces the list either way; this only keeps the picker honest.
export function useAllowedChatModels(): ChatModel[] | undefined {
  const [models, setModels] = useState<ChatModel[]>();

  useEffect(() => {
    let isCurrent = true;

    fetch("/api/chat")
      .then((response) => response.json())
      .then((body) => {
        if (isCurrent) setModels(allowedModelsResponseSchema.parse(body).models);
      })
      .catch((error) => {
        // The picker falls back to listing every model.
        console.warn("Could not load the available chat models:", error);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return models;
}
