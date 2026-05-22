import { TokenPair, TokenStorage } from './types';

/**
 * Default in-memory token storage.
 *
 * Suitable for most SPA use-cases where tokens live only in memory.
 * For persistence across page reloads, provide a custom {@link TokenStorage}
 * backed by `localStorage` or a state-management store.
 */
export class InMemoryTokenStorage implements TokenStorage {
  private tokens: TokenPair | null = null;

  get(): TokenPair | null {
    return this.tokens;
  }

  set(tokens: TokenPair): void {
    this.tokens = tokens;
  }

  clear(): void {
    this.tokens = null;
  }
}
