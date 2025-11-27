export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface InviteCode {
  code: string;
  createdBy: string;
  createdAt: Date;
  used: boolean;
  usedBy?: string;
  usedAt?: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: Date;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed' | 'queue' | 'review' | 'done';
  time?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
}
// src/app/models.ts
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface InviteCode {
  code: string;
  createdBy: string;
  createdAt: Date;
  used: boolean;
  usedBy?: string;
  usedAt?: Date;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
}
