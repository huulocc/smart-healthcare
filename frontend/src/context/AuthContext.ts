import { createContext } from 'react';

import type { Role, User } from '../api/types';

/**
 * 'resolving' is the gap right after a page refresh: the token comes back from storage at
 * once, but whose it is only becomes known when /users/me answers. Anything that decides by
 * role has to wait that out, instead of reading an unknown role as the wrong one.
 */
export type AuthStatus = 'anonymous' | 'resolving' | 'authenticated';

export interface AuthContextValue {
  status: AuthStatus;
  /** True as soon as a token is known, which is all the public pages ask about. */
  isAuthenticated: boolean;
  user: User | null;
  role: Role | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  /** Signs in with the ID token that the Google button gives the browser. */
  loginWithGoogle: (credential: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
