import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { User, InviteCode } from '../models';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Фиксированный админский код
  private readonly ADMIN_INVITE_CODE = 'ADMIN2024';

  constructor(
    private database: DatabaseService,
    private router: Router
  ) {
    this.checkAuthState();
    this.createDefaultAdminCode();
  }

  // Создаем дефолтный админ-код при инициализации
  private async createDefaultAdminCode() {
    try {
      const existingAdminCode = await this.database.inviteCodes.get(this.ADMIN_INVITE_CODE);
      if (!existingAdminCode) {
        await this.database.inviteCodes.add({
          code: this.ADMIN_INVITE_CODE,
          used: false,
          createdAt: new Date(),
          createdBy: 'system',
          isAdminCode: true
        });
        console.log('✅ Админский инвайт-код создан:', this.ADMIN_INVITE_CODE);
      }
    } catch (error) {
      console.log('Админский код уже существует');
    }
  }

  async register(email: string, inviteCode: string): Promise<boolean> {
    try {
      console.log('Регистрация:', { email, inviteCode });

      const code = await this.database.inviteCodes
        .where('code')
        .equals(inviteCode)
        .first();

      console.log('Найден код:', code);

      if (!code) {
        console.log('Код не найден');
        return false;
      }

      if (code.used && !code.isAdminCode) {
        console.log('Код уже использован');
        return false;
      }

      // Проверяем не зарегистрирован ли уже админ
      if (code.isAdminCode) {
        const existingAdmin = await this.database.users
          .where('isAdmin')
          .equals(1)
          .first();

        console.log('Существующий админ:', existingAdmin);

        if (existingAdmin) {
          console.log('Админ уже существует');
          return false;
        }
      }

      // Помечаем код как использованный (кроме админского)
      if (!code.isAdminCode) {
        await this.database.inviteCodes.update(inviteCode, {
          used: true,
          usedAt: new Date()
        });
      }

      const user: User = {
        id: this.generateId(),
        email: email,
        createdAt: new Date(),
        inviteCode: inviteCode,
        isAdmin: code.isAdminCode || false
      };

      console.log('Создаем пользователя:', user);
      await this.database.users.add(user);

      this.currentUserSubject.next(user);
      localStorage.setItem('currentUser', JSON.stringify(user));

      console.log('Регистрация успешна');
      return true;

    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  async canCreateAdmin(): Promise<boolean> {
    try {
      const existingAdmin = await this.database.users
        .where('isAdmin')
        .equals(1)
        .first();
      return !existingAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return true;
    }
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  private async checkAuthState(): Promise<void> {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const dbUser = await this.database.users.get(user.id);
        if (dbUser) {
          this.currentUserSubject.next(dbUser);
        } else {
          localStorage.removeItem('currentUser');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('currentUser');
    }
  }

  isAdmin(user: User | null): boolean {
    return user?.isAdmin || false;
  }

  // Методы для работы с инвайт-кодами
  async createInviteCode(): Promise<string | null> {
    try {
      const code = this.generateInviteCode();
      const inviteCode: InviteCode = {
        code: code,
        used: false,
        createdAt: new Date(),
        createdBy: this.currentUserSubject.value?.email || 'system'
      };

      await this.database.inviteCodes.add(inviteCode);
      return code;
    } catch (error) {
      console.error('Error creating invite code:', error);
      return null;
    }
  }

  async getUserInviteCodes(userId: string): Promise<InviteCode[]> {
    try {
      return await this.database.inviteCodes
        .where('createdBy')
        .equals(this.currentUserSubject.value?.email || '')
        .toArray();
    } catch (error) {
      console.error('Error getting user invite codes:', error);
      return [];
    }
  }

  async getAllInviteCodes(): Promise<InviteCode[]> {
    try {
      return await this.database.inviteCodes.toArray();
    } catch (error) {
      console.error('Error getting all invite codes:', error);
      return [];
    }
  }

  async debugCreateInviteCode(code: string): Promise<void> {
    try {
      const inviteCode: InviteCode = {
        code: code,
        used: false,
        createdAt: new Date(),
        createdBy: 'debug'
      };
      await this.database.inviteCodes.add(inviteCode);
    } catch (error) {
      console.error('Error creating debug invite code:', error);
      throw error;
    }
  }

  async deleteInviteCode(code: string): Promise<boolean> {
    try {
      await this.database.inviteCodes.delete(code);
      return true;
    } catch (error) {
      console.error('Error deleting invite code:', error);
      return false;
    }
  }

  async resetInviteCodes(): Promise<void> {
    try {
      await this.database.inviteCodes.clear();
      // После сброса создаем админский код заново
      await this.createDefaultAdminCode();
    } catch (error) {
      console.error('Error resetting invite codes:', error);
      throw error;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
