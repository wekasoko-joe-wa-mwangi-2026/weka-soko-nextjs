'use client';
import { useRef, useCallback, useState } from 'react';

/**
 * useDebounce — delays calling fn until after `delay` ms of inactivity.
 * Use for search inputs to avoid hammering the API on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce((q) => fetchResults(q), 400);
 * <input onChange={e => debouncedSearch(e.target.value)} />
 */
export function useDebounce(fn, delay = 400) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

/**
 * useSubmitGuard — prevents double-submission of forms and API calls.
 * Returns [loading, guard] where guard wraps an async function.
 *
 * @example
 * const [loading, guard] = useSubmitGuard();
 * <button onClick={guard(handleSubmit)} disabled={loading}>Submit</button>
 */
export function useSubmitGuard() {
  const [loading, setLoading] = useState(false);
  const active = useRef(false);

  const guard = useCallback((fn) => async (...args) => {
    if (active.current) return;  // already in flight — ignore
    active.current = true;
    setLoading(true);
    try {
      await fn(...args);
    } finally {
      active.current = false;
      setLoading(false);
    }
  }, []);

  return [loading, guard];
}

/**
 * useRateLimit — blocks a function from being called more than
 * `maxCalls` times per `windowMs` milliseconds.
 * Useful for unlock / payment buttons.
 *
 * @example
 * const canUnlock = useRateLimit(3, 60000); // max 3 unlocks per minute
 * <button onClick={() => { if (!canUnlock()) return; handleUnlock(); }}>Unlock</button>
 */
export function useRateLimit(maxCalls = 3, windowMs = 60000) {
  const calls = useRef([]);

  return useCallback(() => {
    const now = Date.now();
    calls.current = calls.current.filter(t => now - t < windowMs);
    if (calls.current.length >= maxCalls) return false;
    calls.current.push(now);
    return true;
  }, [maxCalls, windowMs]);
}

/**
 * useThrottle — ensures fn is called at most once per `limit` ms.
 * Use for scroll handlers or resize events.
 */
export function useThrottle(fn, limit = 300) {
  const lastCall = useRef(0);
  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCall.current >= limit) {
      lastCall.current = now;
      fn(...args);
    }
  }, [fn, limit]);
}
