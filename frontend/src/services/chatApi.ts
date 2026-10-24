/**
 * Client for the RAG chat service.
 *
 * Calls relative paths only, so the same code works whether the request is
 * proxied to the Python service (now) or handled by Spring Boot (later).
 */
import { getStoredToken } from '../api/client';


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

export interface TriageReply {
  urgency: 'routine' | 'soon' | 'emergency' | 'uncertain';
  department_id: number | null;
  department_name: string | null;
  doctor_id: number | null;
  doctor_name: string | null;
  reason: string;
  safety_message: string;
  source_ids: string[];
  sources: ChatSource[];
  tools_called: string[];
  elapsed_seconds: number;
}

export async function requestDepartmentGuidance(question: string): Promise<TriageReply> {
  const token = getStoredToken();
  if (!token) throw new ChatError('Sign in to get department guidance.');
  let response: Response;
  try {
    response = await fetch('/api/chat/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new ChatError('Could not reach the assistant. Please try again.');
  }
  if (response.status === 401 || response.status === 403) {
    throw new ChatError('Your session has expired. Sign in again for department guidance.');
  }
  if (!response.ok) {
    throw new ChatError('Department guidance is unavailable right now. Please try again.');
  }
  return (await response.json()) as TriageReply;
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

export interface StreamHandlers {
  onSources?: (sources: ChatSource[]) => void;
  /** Fires when the model starts reasoning. The reasoning text itself is
   *  deliberately not passed on - see the note in AIChatWidget. */
  onThinking?: () => void;
  onToken?: (delta: string) => void;
}

/**
 * Streaming variant. The answer is identical to sendChatMessage at
 * temperature 0; only the delivery differs, which matters because with
 * reasoning enabled the first answer token can be 40 seconds away.
 *
 * The transport is newline-delimited JSON over fetch, not SSE: EventSource
 * cannot send a POST body.
 */
export async function streamChatMessage(
  question: string,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ChatError('Could not reach the assistant. Is the chat service running?');
  }

  if ([502, 503, 504].includes(response.status)) {
    throw new ChatError('The assistant is offline right now. Please try again shortly.');
  }
  if (!response.ok || !response.body) {
    throw new ChatError('Something went wrong while answering. Please try again.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let sawThinking = false;

  // A chunk can split a JSON line anywhere, so only whole lines are parsed and
  // the remainder is carried over.
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as {
        type: string;
        delta?: string;
        sources?: ChatSource[];
        message?: string;
      };

      if (event.type === 'sources') {
        handlers.onSources?.(event.sources ?? []);
      } else if (event.type === 'thinking') {
        if (!sawThinking) {
          sawThinking = true;
          handlers.onThinking?.();
        }
      } else if (event.type === 'token' && event.delta) {
        answer += event.delta;
        handlers.onToken?.(event.delta);
      } else if (event.type === 'error') {
        // The stream opened with a 200 before this went wrong, so the failure
        // arrives in the body rather than as a status code.
        throw new ChatError('The assistant is offline right now. Please try again shortly.');
      }
    }
  }

  return answer;
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
