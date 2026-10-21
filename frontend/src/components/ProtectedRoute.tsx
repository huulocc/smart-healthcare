import type { ReactNode } from 'react';

import RequireRole from './RequireRole';

/**
 * Signed in, any role. RequireRole without a role is exactly that, and going through it
 * keeps one rule for waiting while the account resolves after a refresh.
 */
const ProtectedRoute = ({ children }: { children: ReactNode }) => (
  <RequireRole>{children}</RequireRole>
);

export default ProtectedRoute;
