"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchHistory,
  sendMessage as apiSendMessage,
  type Message,
} from "@/lib/api";

const STORAGE_KEY = "chatSessionId";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idCounter = useRef(0);
  const nextId = () => `local-${Date.now()}-${idCounter.current++}`;

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (!stored) return;

    setSessionId(stored);
    fetchHistory(stored)
      .then((data) => {
        if (data?.messages) setMessages(data.messages);
      })
      .catch(() => {});
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const optimistic: Message = {
        id: nextId(),
        sender: "user",
        text: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setIsLoading(true);
      setError(null);

      try {
        const { reply, sessionId: newSessionId } = await apiSendMessage(
          trimmed,
          sessionId ?? undefined
        );

        setSessionId(newSessionId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, newSessionId);
        }

        const aiMessage: Message = {
          id: nextId(),
          sender: "ai",
          text: reply,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId]
  );

  const dismissError = useCallback(() => setError(null), []);

  return { messages, isLoading, error, sendMessage, dismissError };
}
