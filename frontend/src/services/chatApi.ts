/**
 * Client for the RAG chat service.
 *
 * Calls relative paths only, so the same code works whether the request is
 * proxied to the Python service (now) or handled by Spring Boot (later).
 */

export interface ChatSource {
  section: string;
  heading: string;
  pages: string;
  document: string;
  score: number;
}

export interface ChatReply {
  answer: string;
  sources: ChatSource[];
  elapsed_seconds: number;
}

export interface HealthStatus {
  index: boolean;
  ollama: boolean;
  chunks: number;
  ready: boolean;
}

/** Thrown with a message that is safe to show the user as-is. */
export class ChatError extends Error {}

export async function sendChatMessage(
  question: string,
  signal?: AbortSignal
): Promise<ChatReply> {
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ChatError('Could not reach the assistant. Is the chat service running?');
  }

  // 503 is the service reporting its model backend is down; 502/504 come from
  // the dev proxy when the service itself is not running. Both mean "nothing is
  // there to answer", which is worth saying plainly - the most common cause is
  // simply that `python rag/server.py` was never started.
  if ([502, 503, 504].includes(response.status)) {
    throw new ChatError('The assistant is offline right now. Please try again shortly.');
  }
  if (!response.ok) {
    throw new ChatError('Something went wrong while answering. Please try again.');
  }

  return (await response.json()) as ChatReply;
}

export async function checkChatHealth(): Promise<HealthStatus | null> {
  try {
    const response = await fetch('/api/chat/health');
    if (!response.ok) return null;
    return (await response.json()) as HealthStatus;
  } catch {
    return null;
  }
}
