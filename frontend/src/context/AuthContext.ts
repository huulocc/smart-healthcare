import { createContext } from 'react';

export interface AuthContextValue {
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  /** Signs in with the ID token that the Google button gives the browser. */
  loginWithGoogle: (credential: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
