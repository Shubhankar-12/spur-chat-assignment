"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/api";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

type Props = {
  messages: Message[];
  isLoading: boolean;
};

export default function MessageList({ messages, isLoading }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
      {messages.length === 0 && !isLoading && (
        <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            FS
          </div>
          <p className="text-sm">
            Hi! I&apos;m the FakeStore support agent.
            <br />
            Ask me about shipping, returns, payments, and more.
          </p>
        </div>
      )}

      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}

      {isLoading && <TypingIndicator />}
    </div>
  );
}
