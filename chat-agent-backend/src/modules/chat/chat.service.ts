import db from '../../db/client';
import { cacheSession, getCachedSession } from '../../cache/redis';
import { ensureConversation, getMessages, insertMessage } from '../../db/repository';
import { generateReply } from '../../lib/llm';
import { LLMHistoryEntry } from '../../lib/types';

function buildFaqContext(): string {
  const rows = db.prepare('SELECT topic, content FROM faq').all() as {
    topic: string;
    content: string;
  }[];
  return rows.map((r) => `[${r.topic}]: ${r.content}`).join('\n');
}

export async function postMessage(
  message: string,
  sessionId?: string
): Promise<{ reply: string; sessionId: string }> {
  const conversationId = ensureConversation(sessionId);

  const faqContext = buildFaqContext();

  let transcript = await getCachedSession(conversationId);
  if (transcript) {
    console.log(`[cache] HIT session:${conversationId}`);
  } else {
    console.log(`[cache] MISS session:${conversationId} — reading SQLite`);
    transcript = getMessages(conversationId);
  }

  const history: LLMHistoryEntry[] = transcript.map((m) => ({
    role: m.sender === 'ai' ? 'assistant' : 'user',
    content: m.text,
  }));

  insertMessage(conversationId, 'user', message);

  const reply = await generateReply(history, message, faqContext);
  insertMessage(conversationId, 'ai', reply);

  await cacheSession(conversationId, getMessages(conversationId));

  return { reply, sessionId: conversationId };
}
