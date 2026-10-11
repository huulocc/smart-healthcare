export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  dob: string | null;
  address: string | null;
  role: Role;
  /** What the user asked to be at sign-up; becomes the real role only after an admin approves. */
  requestedRole: Role | null;
  /** False until the activation link sent by email has been opened. */
  emailVerified: boolean;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}
