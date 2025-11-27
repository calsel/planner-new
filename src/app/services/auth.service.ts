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

  constructor(
    private database: DatabaseService,
    private router: Router
  ) {
    this.checkAuthState();
  }

  async login(inviteCode: string): Promise<boolean> {
    try {
      const code = await this.database.inviteCodes
        .where('code')
        .equals(inviteCode)
        .first();

      if (code && !code.used) {
        // Помечаем код как использованный
        await this.database.inviteCodes.update(code.code, {
          used: true,
          usedAt: new Date()
        });

        // Создаем или получаем пользователя
        let user = await this.database.users
          .where('email')
          .equals(code.createdBy || 'system')
          .first();

        if (!user) {
          user = {
            id: this.generateId(),
            email: code.createdBy || 'user@example.com',
            createdAt: new Date(),
            inviteCode: code.code // Теперь это свойство существует
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

  logout(): void {
    console.log('AuthService: Logging out user');
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');

    // Перенаправляем на страницу входа
    this.router.navigate(['/login']);
  }

  async register(inviteCode: string, email: string): Promise<boolean> {
    try {
      const code = await this.database.inviteCodes
        .where('code')
        .equals(inviteCode)
        .first();

      if (code && !code.used) {
        await this.database.inviteCodes.update(code.code, {
          used: true,
          usedAt: new Date()
        });

        const user: User = {
          id: this.generateId(),
          email: email,
          createdAt: new Date(),
          inviteCode: code.code // Теперь это свойство существует
        };

        await this.database.users.add(user);
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  private async checkAuthState(): Promise<void> {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // Проверяем что пользователь все еще существует в БД
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
    return user?.email === 'admin@example.com' || user?.email === 'calsel@example.com';
  }

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
