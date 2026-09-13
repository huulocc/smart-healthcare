export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
}

export const CURRENT_USER: User = {
  id: 'u1',
  fullName: 'John Doe',
  email: 'johndoe@example.com',
  phone: '0901234567',
  dob: '1995-03-12',
  address: '123 Main Street, District 1, Ho Chi Minh City',
};

export const DEMO_CREDENTIALS = {
  email: CURRENT_USER.email,
  password: 'password123',
};
