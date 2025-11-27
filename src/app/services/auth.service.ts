import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EncryptionUtil } from '../utils/encryption.util';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
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

export interface InviteCode {
  code: string;
  createdBy: string;
  createdAt: Date;
  used: boolean;
  usedBy?: string;
  usedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private readonly ADMIN_EMAIL = 'ivandetad@gmail.com';
  private useEncryption = true; // Включить шифрование для продакшена

  private defaultInviteCodes = [
    'PLANNER2024',
    'DAILYPLAN',
    'PRODUCTIVITY',
    'ORGANIZE2024',
    'TASKMASTER'
  ];

  constructor() {
    this.initializeDefaultInviteCodes();
    this.checkStoredAuth();
  }

  isAdmin(user: User | null): boolean {
    return user?.email === this.ADMIN_EMAIL;
  }

  async login(loginData: LoginData): Promise<boolean> {
    const users = this.getUsersFromStorage();
    const user = users.find(u => u.email === loginData.email);

    if (user) {
      const userData = localStorage.getItem(`user_${user.id}`);
      if (userData) {
        try {
          const storedUser = JSON.parse(userData);

          if (this.useEncryption) {
            // Проверяем пароль с шифрованием
            const decryptedPassword = EncryptionUtil.decrypt(storedUser.password);
            if (decryptedPassword === loginData.password) {
              const { password, ...userWithoutPassword } = storedUser;
              this.currentUserSubject.next(userWithoutPassword as User);
              localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
              return true;
            }
          } else {
            // Старый метод без шифрования (для совместимости)
            if (storedUser.password === loginData.password) {
              const { password, ...userWithoutPassword } = storedUser;
              this.currentUserSubject.next(userWithoutPassword as User);
              localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
              return true;
            }
          }
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      }
    }
    return false;
  }

  async register(registerData: RegisterData): Promise<boolean> {
    if (!this.validateInviteCode(registerData.inviteCode)) {
      return false;
    }

    const users = this.getUsersFromStorage();

    if (users.find(u => u.email === registerData.email)) {
      return false;
    }

    if (registerData.password !== registerData.confirmPassword) {
      return false;
    }

    if (registerData.password.length < 6) {
      return false;
    }

    try {
      const newUser: User & { password: string } = {
        id: this.generateId(),
        name: registerData.name,
        email: registerData.email,
        password: this.useEncryption
          ? EncryptionUtil.encrypt(registerData.password)
          : registerData.password,
        createdAt: new Date()
      };

      this.markInviteCodeAsUsed(registerData.inviteCode, newUser.id);

      users.push({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt
      });

      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem(`user_${newUser.id}`, JSON.stringify(newUser));

      const { password, ...userWithoutPassword } = newUser;
      this.currentUserSubject.next(userWithoutPassword as User);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  // Миграция старых паролей на шифрование
  async migrateUserPasswords(): Promise<void> {
    if (!this.useEncryption) return;

    const users = this.getUsersFromStorage();

    for (const user of users) {
      const userKey = `user_${user.id}`;
      const userData = localStorage.getItem(userKey);

      if (userData) {
        try {
          const storedUser = JSON.parse(userData);

          // Если пароль не зашифрован, шифруем его
          if (storedUser.password && !storedUser.password.startsWith('encrypted:')) {
            const encryptedPassword = EncryptionUtil.encrypt(storedUser.password);
            storedUser.password = encryptedPassword;
            localStorage.setItem(userKey, JSON.stringify(storedUser));
          }
        } catch (error) {
          console.error(`Migration error for user ${user.id}:`, error);
        }
      }
    }
  }

  validateInviteCode(code: string): boolean {
    const inviteCodes = this.getInviteCodesFromStorage();
    const inviteCode = inviteCodes.find(invite => invite.code === code.toUpperCase());

    return !!inviteCode && !inviteCode.used;
  }

  generateInviteCode(createdBy: string): string | null {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !this.isAdmin(currentUser)) {
      return null;
    }

    const newCode: InviteCode = {
      code: this.generateRandomCode(),
      createdBy: createdBy,
      createdAt: new Date(),
      used: false
    };

    const inviteCodes = this.getInviteCodesFromStorage();
    inviteCodes.push(newCode);
    localStorage.setItem('invite-codes', JSON.stringify(inviteCodes));

    return newCode.code;
  }

  getAvailableInviteCodes(): InviteCode[] {
    const inviteCodes = this.getInviteCodesFromStorage();
    return inviteCodes.filter(code => !code.used);
  }

  getUsedInviteCodes(): InviteCode[] {
    const inviteCodes = this.getInviteCodesFromStorage();
    return inviteCodes.filter(code => code.used);
  }

  getUserInviteCodes(userId: string): InviteCode[] {
    const inviteCodes = this.getInviteCodesFromStorage();
    const currentUser = this.getCurrentUser();

    if (currentUser && this.isAdmin(currentUser)) {
      return inviteCodes;
    } else {
      return [];
    }
  }

  deleteInviteCode(code: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !this.isAdmin(currentUser)) {
      return false;
    }

    const inviteCodes = this.getInviteCodesFromStorage();
    const codeIndex = inviteCodes.findIndex(invite => invite.code === code);

    if (codeIndex !== -1) {
      if (inviteCodes[codeIndex].used) {
        return false;
      }

      inviteCodes.splice(codeIndex, 1);
      localStorage.setItem('invite-codes', JSON.stringify(inviteCodes));
      return true;
    }
    return false;
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // Включить/выключить шифрование
  setEncryption(enabled: boolean): void {
    this.useEncryption = enabled;
  }

  isEncryptionEnabled(): boolean {
    return this.useEncryption;
  }

  private markInviteCodeAsUsed(code: string, usedBy: string): void {
    const inviteCodes = this.getInviteCodesFromStorage();
    const inviteCodeIndex = inviteCodes.findIndex(invite => invite.code === code.toUpperCase());

    if (inviteCodeIndex !== -1) {
      inviteCodes[inviteCodeIndex].used = true;
      inviteCodes[inviteCodeIndex].usedBy = usedBy;
      inviteCodes[inviteCodeIndex].usedAt = new Date();
      localStorage.setItem('invite-codes', JSON.stringify(inviteCodes));
    }
  }

  private initializeDefaultInviteCodes(): void {
    const existingCodes = this.getInviteCodesFromStorage();

    if (existingCodes.length === 0) {
      const defaultCodes: InviteCode[] = this.defaultInviteCodes.map(code => ({
        code: code,
        createdBy: 'system',
        createdAt: new Date(),
        used: false
      }));

      localStorage.setItem('invite-codes', JSON.stringify(defaultCodes));
    }
  }

  private getInviteCodesFromStorage(): InviteCode[] {
    const stored = localStorage.getItem('invite-codes');
    if (stored) {
      try {
        return JSON.parse(stored).map((code: any) => ({
          ...code,
          createdAt: new Date(code.createdAt),
          usedAt: code.usedAt ? new Date(code.usedAt) : undefined
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  private getUsersFromStorage(): User[] {
    const stored = localStorage.getItem('users');
    return stored ? JSON.parse(stored) : [];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private checkStoredAuth(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (e) {
        this.logout();
      }
    }
  }
}
