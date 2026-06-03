import crypto from 'crypto';
import db from './client';
import { ConversationRow, Message } from '../lib/types';

export function getConversation(id: string): ConversationRow | undefined {
  return db
    .prepare('SELECT id, created_at, metadata FROM conversations WHERE id = ?')
    .get(id) as ConversationRow | undefined;
}

function createConversation(id: string): void {
  db.prepare(
    'INSERT INTO conversations (id, created_at, metadata) VALUES (?, ?, ?)'
  ).run(id, Date.now(), null);
}

export function ensureConversation(sessionId?: string): string {
  if (sessionId && getConversation(sessionId)) return sessionId;
  const id = sessionId ?? crypto.randomUUID();
  createConversation(id);
  return id;
}

export function insertMessage(
  conversationId: string,
  sender: 'user' | 'ai',
  text: string
): void {
  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender, text, timestamp)
     VALUES (?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), conversationId, sender, text, Date.now());
}

export function getMessages(conversationId: string): Message[] {
  return db
    .prepare(
      `SELECT id, conversation_id, sender, text, timestamp
         FROM messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC, rowid ASC`
    )
    .all(conversationId) as Message[];
}
