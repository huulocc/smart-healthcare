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
  fullName: 'Nguyễn Văn A',
  email: 'nguyenvana@example.com',
  phone: '0901234567',
  dob: '1995-03-12',
  address: '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
};
