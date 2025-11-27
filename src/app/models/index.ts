export interface User {
  id: string;
  email: string;
  createdAt: Date;
  inviteCode?: string; // Добавьте это свойство
}

export interface InviteCode {
  code: string;
  used: boolean;
  createdAt: Date;
  usedAt?: Date;
  createdBy?: string;
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
