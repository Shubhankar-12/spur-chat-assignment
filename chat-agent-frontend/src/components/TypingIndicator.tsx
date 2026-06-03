"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
        FS
      </div>
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
          <span className="typing-dot h-2 w-2 rounded-full bg-gray-400" />
          <span
            className="typing-dot h-2 w-2 rounded-full bg-gray-400"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="typing-dot h-2 w-2 rounded-full bg-gray-400"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
        <span className="mt-1 px-1 text-xs text-gray-400">
          FakeStore agent is typing…
        </span>
      </div>
    </div>
  );
}
