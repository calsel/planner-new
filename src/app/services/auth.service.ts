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

  // Фиксированный админский код - знает только разработчик
  private readonly ADMIN_INVITE_CODE = 'ADMIN2024';
  private readonly ADMIN_EMAILS = ['admin@planner.com', 'calsel@example.com'];

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
        console.log('✅ Админский инвайт-код создан');
      }
    } catch (error) {
      console.log('Админский код уже существует');
    }
  }

  async login(inviteCode: string): Promise<boolean> {
    try {
      const code = await this.database.inviteCodes
        .where('code')
        .equals(inviteCode)
        .first();

      if (code && !code.used) {
        // Помечаем код как использованный (кроме админского кода)
        if (!code.isAdminCode) {
          await this.database.inviteCodes.update(code.code, {
            used: true,
            usedAt: new Date()
          });
        }

        // Создаем или получаем пользователя
        let user = await this.database.users
          .where('email')
          .equals(code.createdBy || 'user@example.com')
          .first();

        if (!user) {
          user = {
            id: this.generateId(),
            email: code.createdBy || 'user@example.com',
            createdAt: new Date(),
            inviteCode: code.code,
            isAdmin: code.isAdminCode || false
          };
          await this.database.users.add(user);
        }

        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async register(email: string, inviteCode: string): Promise<boolean> {
    try {
      const code = await this.database.inviteCodes
        .where('code')
        .equals(inviteCode)
        .first();

      if (!code) {
        this.errorMessage = 'Неверный инвайт-код';
        return false;
      }

      if (code.used && !code.isAdminCode) {
        this.errorMessage = 'Этот инвайт-код уже использован';
        return false;
      }

      // Проверяем не зарегистрирован ли уже админ
      if (code.isAdminCode) {
        const existingAdmin = await this.database.users
          .where('isAdmin')
          .equals(1)
          .first();

        if (existingAdmin) {
          this.errorMessage = 'Администратор уже зарегистрирован в системе';
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

      await this.database.users.add(user);
      this.currentUserSubject.next(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      this.errorMessage = 'Ошибка регистрации';
      return false;
    }
  }

  // Проверка можно ли создать администратора
  async canCreateAdmin(): Promise<boolean> {
    const existingAdmin = await this.database.users
      .where('isAdmin')
      .equals(1)
      .first();
    return !existingAdmin;
  }

  logout(): void {
    console.log('AuthService: Logging out user');
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

  // ... остальные методы без изменений
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

  private errorMessage: string = '';

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
