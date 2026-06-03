export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface ConversationRow {
  id: string;
  created_at: number;
  metadata: string | null;
}

export interface LLMHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}
