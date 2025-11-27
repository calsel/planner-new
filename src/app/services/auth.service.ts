import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() { }

  // ДОБАВЛЕНО: метод для auth guard
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // ДОБАВЛЕНО: недостающие методы из ошибок
  async canCreateAdmin(): Promise<boolean> {
    // Ваша логика проверки возможности создания админа
    return true;
  }

  async register(email: string, inviteCode: string): Promise<boolean> {
    // Ваша логика регистрации
    console.log('Registering user:', email, inviteCode);
    return true;
  }

  isAdmin(user: any): boolean {
    // Ваша логика проверки админских прав
    return user && user.role === 'admin';
  }

  async getUserInviteCodes(userId: string): Promise<any[]> {
    // Ваша логика получения кодов пользователя
    return [];
  }

  async getAllInviteCodes(): Promise<any[]> {
    // Ваша логика получения всех кодов
    return [];
  }

  async createInviteCode(): Promise<string> {
    // Ваша логика создания кода
    return 'NEWCODE' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  async debugCreateInviteCode(code: string): Promise<void> {
    // Ваша логика отладочного создания кода
    console.log('Debug creating code:', code);
  }

  async deleteInviteCode(code: any): Promise<boolean> {
    // Ваша логика удаления кода
    console.log('Deleting code:', code);
    return true;
  }

  async resetInviteCodes(): Promise<void> {
    // Ваша логика сброса кодов
    console.log('Resetting invite codes');
  }

  // Существующие методы
  login(user: any) {
    this.currentUserSubject.next(user);
  }

  logout() {
    this.currentUserSubject.next(null);
  }

  // Другие ваши методы остаются без изменений
  async validateInviteCode(code: string): Promise<boolean> {
    try {
      // @ts-ignore
      const db = await import('../../db/db.json', { assert: { type: 'json' } });
      // @ts-ignore
      const inviteCodes = db.default.inviteCodes || [];

      const validCode = inviteCodes.find((invite: any) =>
        invite.code === code && invite.status === 'active'
      );

      return !!validCode;
    } catch (error) {
      console.error('Error validating invite code:', error);
      return false;
    }
  }

  async createUser(email: string, code: string): Promise<any> {
    try {
      // @ts-ignore
      const db = await import('../../db/db.json', { assert: { type: 'json' } });
      // @ts-ignore
      const inviteCodes = db.default.inviteCodes || [];

      // Find and mark code as used
      const codeIndex = inviteCodes.findIndex((invite: any) => invite.code === code);
      if (codeIndex !== -1) {
        inviteCodes[codeIndex].status = 'used';
        inviteCodes[codeIndex].usedAt = new Date().toISOString();
        inviteCodes[codeIndex].usedBy = email;
      }

      // Create user
      const newUser = {
        id: Date.now().toString(),
        email: email,
        role: 'user',
        createdAt: new Date().toISOString()
      };

      // @ts-ignore
      const users = db.default.users || [];
      users.push(newUser);

      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
}
