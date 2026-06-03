"use client";

import { useChat } from "@/hooks/useChat";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

export default function ChatWindow() {
  const { messages, isLoading, error, sendMessage, dismissError } = useChat();

  return (
    <div className="flex h-[90vh] max-h-[800px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
      <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          FS
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold text-gray-900">
            FakeStore Support
          </h1>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Online
          </span>
        </div>
      </header>

      <MessageList messages={messages} isLoading={isLoading} />

      {error && (
        <div className="flex items-center justify-between gap-3 border-t border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span className="break-words">{error}</span>
          <button
            type="button"
            onClick={dismissError}
            aria-label="Dismiss error"
            className="shrink-0 rounded p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-4 w-4"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
