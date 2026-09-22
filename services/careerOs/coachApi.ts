/**
 * Thin client for the career-coach Edge Function (COS-027, server half).
 * One call = one user turn: the server stores the message, builds a bounded
 * owned context bundle, answers with citations and registered-tool
 * proposals, and persists the assistant message. Proposals are executed by
 * the user through ./gateway.ts, never here.
 */
import { callFn, type FnError } from '../api';
import { type CoachReply, mapCoachReply } from './gatewayMappers';
import { GatewayError } from './gateway';

export const COACH_FN = 'career-coach';

export type CoachLocale = 'en' | 'es' | 'fr' | 'de';

export interface CoachContextRefs {
  goal?: string;
  campaign?: string;
  opportunity?: string;
  application?: string;
}

export interface SendCoachMessageInput {
  /** Omit to start a new conversation scoped to `contextRefs`. */
  conversationId?: string;
  message: string;
  /** Overrides the conversation's stored selection (the user changed context). */
  contextRefs?: CoachContextRefs;
  locale?: CoachLocale;
}

export async function sendCoachMessage(input: SendCoachMessageInput): Promise<CoachReply> {
  const message = input.message.trim();
  if (!message) throw new Error('message is empty');
  try {
    const raw = await callFn<unknown>(COACH_FN, {
      ...(input.conversationId ? { conversationId: input.conversationId } : {}),
      message: message.slice(0, 4000),
      ...(input.contextRefs ? { contextRefs: input.contextRefs } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
    });
    return mapCoachReply(raw);
  } catch (e) {
    if (e && typeof e === 'object' && ('code' in e || 'status' in e)) throw new GatewayError(e as FnError);
    throw e;
  }
}
