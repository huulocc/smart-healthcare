import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { login as loginRequest } from '../api/authApi';
import { clearStoredToken, getStoredToken, setUnauthorizedHandler, storeToken } from '../api/client';
import { AuthContext, type AuthContextValue } from './AuthContext';

const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Read once on start, so a logged-in user stays logged in after a page refresh.
  const [token, setToken] = useState<string | null>(getStoredToken);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await loginRequest(email, password);
    storeToken(accessToken);
    setToken(accessToken);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: token !== null, login, logout }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
