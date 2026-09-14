export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  dob: string | null;
  address: string | null;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}
