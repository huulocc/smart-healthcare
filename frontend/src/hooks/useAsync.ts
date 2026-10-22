import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '../api/errors';

/** The same three states Profile.tsx uses, so the app has one shape for "waiting on the API". */
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

export interface AsyncResult<T> {
  state: AsyncState<T>;
  /** Fetches again, e.g. behind a Try Again button or after a save. */
  reload: () => void;
  /** Replaces what is on screen with a response already in hand, without a round trip. */
  setData: (data: T) => void;
}

/**
 * Loads something from the API and keeps it in one of three states.
 *
 * `load` is read fresh on every run but is deliberately not a dependency: it would be a new
 * function on every render, and the effect would never stop. `deps` is what decides when to
 * fetch again -- list every filter and page number the call reads.
 */
export function useAsync<T>(
  load: () => Promise<T>,
  deps: unknown[],
): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    // Drop a late answer: the filters may have moved on, and in development React runs
    // every effect twice, so two requests are in the air at once.
    let ignore = false;
    setState({ status: 'loading' });

    loadRef.current().then(
      (data) => {
        if (!ignore) setState({ status: 'ready', data });
      },
      (error) => {
        if (!ignore)
          setState({ status: 'error', message: toApiError(error).message });
      },
    );

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  const setData = useCallback(
    (data: T) => setState({ status: 'ready', data }),
    [],
  );

  return { state, reload, setData };
}
