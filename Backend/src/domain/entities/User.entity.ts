export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
