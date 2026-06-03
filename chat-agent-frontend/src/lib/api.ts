const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type Message = {
  id: string;
  conversation_id?: string;
  sender: "user" | "ai";
  text: string;
  timestamp: number;
};

export async function sendMessage(message: string, sessionId?: string) {
  const res = await fetch(`${BASE_URL}/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to send message");
  }
  return res.json() as Promise<{ reply: string; sessionId: string }>;
}

export async function fetchHistory(sessionId: string) {
  const res = await fetch(`${BASE_URL}/session/${sessionId}`);
  if (!res.ok) return null;
  return res.json() as Promise<{ sessionId: string; messages: Message[] }>;
}
