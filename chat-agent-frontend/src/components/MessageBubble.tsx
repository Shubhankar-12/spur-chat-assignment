"use client";

import type { Message } from "@/lib/api";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === "user";

  if (isUser) {
    return (
      <div className="animate-message-in flex flex-col items-end">
        <div className="max-w-[75%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-white">
          {message.text}
        </div>
        <span className="mt-1 px-1 text-xs text-gray-400">
          {formatTime(message.timestamp)}
        </span>
      </div>
    );
  }

  return (
    <div className="animate-message-in flex items-end gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
        FS
      </div>
      <div className="flex flex-col items-start">
        <div className="max-w-[75%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-gray-800">
          {message.text}
        </div>
        <span className="mt-1 px-1 text-xs text-gray-400">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
