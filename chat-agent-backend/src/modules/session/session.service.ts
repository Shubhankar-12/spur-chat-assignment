import { cacheSession, getCachedSession } from '../../cache/redis';
import { getConversation, getMessages } from '../../db/repository';
import { AppError } from '../../lib/errors';
import { Message } from '../../lib/types';

export async function getHistory(
  sessionId: string
): Promise<{ sessionId: string; messages: Message[] }> {
  const cached = await getCachedSession(sessionId);
  if (cached) {
    console.log(`[cache] HIT session:${sessionId}`);
    return { sessionId, messages: cached };
  }

  console.log(`[cache] MISS session:${sessionId} — reading SQLite`);

  if (!getConversation(sessionId)) {
    throw new AppError('Conversation not found.', 404);
  }

  const messages = getMessages(sessionId);

  await cacheSession(sessionId, messages);

  return { sessionId, messages };
}
