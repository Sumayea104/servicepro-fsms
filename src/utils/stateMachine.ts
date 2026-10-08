import { AppError } from '../errors/AppError.js';

/** Guards a status transition against a fixed adjacency map instead of trusting an arbitrary client-sent string. */
export function assertTransition<T extends string>(transitions: Record<T, T[]>, from: T, to: T) {
  const allowed = transitions[from] || [];
  if (!allowed.includes(to)) {
    throw AppError.badRequest(`Invalid status transition: ${from} -> ${to}`, [
      { field: 'status', message: `Allowed next states from ${from}: ${allowed.join(', ') || 'none (terminal state)'}` },
    ]);
  }
}
