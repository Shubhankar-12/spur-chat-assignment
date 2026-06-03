import { z } from 'zod';

export const MessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 chars)'),
  sessionId: z.string().uuid().optional(),
});

export type MessageInput = z.infer<typeof MessageSchema>;
