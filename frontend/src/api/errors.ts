import { isAxiosError } from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

// Shape of every error returned by the backend (Spring ProblemDetail).
interface ProblemDetail {
  detail?: string;
  errors?: Record<string, string>;
}

export interface ApiError {
  status: number | null;
  message: string;
  fieldErrors: Record<string, string>;
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
const UNREACHABLE_MESSAGE = 'The server is not responding. Please check that the backend is running and try again.';

export function toApiError(error: unknown): ApiError {
  if (!isAxiosError<ProblemDetail>(error)) {
    return { status: null, message: GENERIC_MESSAGE, fieldErrors: {} };
  }

  const response = error.response;
  const data = response?.data;
  if (!response || (response.status >= 500 && !data?.detail)) {
    return { status: response?.status ?? null, message: UNREACHABLE_MESSAGE, fieldErrors: {} };
  }

  return {
    status: response.status,
    message: data?.detail ?? GENERIC_MESSAGE,
    fieldErrors: data?.errors ?? {},
  };
}

/** Shows server-side errors under the matching inputs. Returns true if at least one error was shown. */
export function applyFieldErrors<T extends FieldValues>(
  fieldErrors: Record<string, string>,
  fieldNames: readonly Path<T>[],
  setError: UseFormSetError<T>,
): boolean {
  let applied = false;
  for (const name of fieldNames) {
    const message = fieldErrors[name];
    if (message) {
      setError(name, { type: 'server', message });
      applied = true;
    }
  }
  return applied;
}
