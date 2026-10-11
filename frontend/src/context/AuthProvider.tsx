import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { login as loginRequest, loginWithGoogle as googleLoginRequest } from '../api/authApi';
import { clearStoredToken, getStoredToken, setUnauthorizedHandler, storeToken } from '../api/client';
import { AuthContext, type AuthContextValue } from './AuthContext';

const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Read once on start, so a logged-in user stays logged in after a page refresh.
  const [token, setToken] = useState<string | null>(getStoredToken);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
  }, []);

  const keepToken = useCallback((accessToken: string, rememberMe: boolean) => {
    storeToken(accessToken, rememberMe);
    setToken(accessToken);
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const { accessToken } = await loginRequest(email, password, rememberMe);
      keepToken(accessToken, rememberMe);
    },
    [keepToken],
  );

  const loginWithGoogle = useCallback(
    async (credential: string, rememberMe = false) => {
      const { accessToken } = await googleLoginRequest(credential, rememberMe);
      keepToken(accessToken, rememberMe);
    },
    [keepToken],
  );

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: token !== null, login, loginWithGoogle, logout }),
    [token, login, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
