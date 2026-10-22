import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  login as loginRequest,
  loginWithGoogle as googleLoginRequest,
} from '../api/authApi';
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  setUnauthorizedHandler,
  storeSession,
  storeUser,
} from '../api/client';
import type { User } from '../api/types';
import { getMyProfile } from '../api/userApi';

import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';

/** A null user means the token outlived its cached account and /users/me has to say who it is. */
interface Session {
  token: string;
  user: User | null;
}

const storedSession = (): Session | null => {
  const token = getStoredToken();
  return token === null ? null : { token, user: getStoredUser() };
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Read once on start, so a logged-in user stays logged in after a page refresh.
  const [session, setSession] = useState<Session | null>(storedSession);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const keepSession = useCallback((token: string, user: User, rememberMe: boolean) => {
    storeSession(token, user, rememberMe);
    setSession({ token, user });
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const { accessToken, user } = await loginRequest(email, password, rememberMe);
      keepSession(accessToken, user, rememberMe);
    },
    [keepSession],
  );

  const loginWithGoogle = useCallback(
    async (credential: string, rememberMe = false) => {
      const { accessToken, user } = await googleLoginRequest(credential, rememberMe);
      keepSession(accessToken, user, rememberMe);
    },
    [keepSession],
  );

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const token = session?.token ?? null;

  // Every start asks the server who this token belongs to, so a role an admin changed
  // cannot live on in the cache. It also fills in the account when only the token survived.
  useEffect(() => {
    if (token === null) return;
    let ignore = false;

    getMyProfile().then(
      (user) => {
        if (ignore) return;
        storeUser(user);
        setSession((current) => (current === null ? null : { ...current, user }));
      },
      () => {
        // A 401 has already ended the session through the interceptor. Otherwise a cached
        // account is still worth showing -- but a token with no account behind it would
        // leave every guard waiting forever, so that one goes.
        if (!ignore && getStoredUser() === null) logout();
      },
    );

    return () => {
      ignore = true;
    };
  }, [token, logout]);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    let status: AuthStatus = 'anonymous';
    if (session !== null) status = user === null ? 'resolving' : 'authenticated';

    return {
      status,
      isAuthenticated: session !== null,
      user,
      role: user?.role ?? null,
      login,
      loginWithGoogle,
      logout,
    };
  }, [session, login, loginWithGoogle, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
