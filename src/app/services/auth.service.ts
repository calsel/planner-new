import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DatabaseService } from './database.service';
import { EncryptionUtil } from '../utils/encryption.util';
import { User, InviteCode, LoginData, RegisterData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private readonly ADMIN_EMAIL = 'ivandetad@gmail.com';
  private useEncryption = true;

  private defaultInviteCodes = [
    'PLANNER2024',
    'DAILYPLAN',
    'PRODUCTIVITY',
    'ORGANIZE2024',
    'TASKMASTER'
  ];

  constructor(private database: DatabaseService) {
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      // Проверяем и выполняем миграцию если нужно
      if (await this.database.shouldMigrate()) {
        console.log('Migrating data from localStorage to IndexedDB...');
        await this.database.migrateFromLocalStorage();
      }

      // Инициализируем дефолтные инвайт-коды если их нет
      await this.initializeDefaultInviteCodes();

      // Проверяем авторизацию
      this.checkStoredAuth();
    } catch (error) {
      console.error('App initialization error:', error);
    }
  }

  // Метод для сброса инвайт-кодов
  async resetInviteCodes(): Promise<void> {
    try {
      console.log('Resetting all invite codes...');

      // Удаляем все существующие коды
      await this.database.inviteCodes.clear();
      console.log('All invite codes cleared');

      // Создаем новые дефолтные коды
      const defaultCodes: InviteCode[] = this.defaultInviteCodes.map(code => ({
        code: code,
        createdBy: 'system',
        createdAt: new Date(),
        used: false
      }));

      await this.database.inviteCodes.bulkAdd(defaultCodes);
      console.log('Default invite codes reinitialized:', defaultCodes.map(c => c.code));

      // Проверяем что коды создались
      const availableCodes = await this.getAvailableInviteCodes();
      console.log('Now available codes:', availableCodes.map(c => c.code));
    } catch (error) {
      console.error('Error resetting invite codes:', error);
    }
  }

  // Метод для создания тестового кода
  async debugCreateInviteCode(code: string): Promise<void> {
    try {
      const existingCode = await this.database.findInviteCode(code);
      if (existingCode) {
        console.log('Code already exists:', code);
        return;
      }

      const newCode: InviteCode = {
        code: code,
        createdBy: 'debug',
        createdAt: new Date(),
        used: false
      };

      await this.database.inviteCodes.add(newCode);
      console.log('Debug invite code created:', code);
    } catch (error) {
      console.error('Error creating debug invite code:', error);
    }
  }

  isAdmin(user: User | null): boolean {
    return user?.email === this.ADMIN_EMAIL;
  }

  async login(loginData: LoginData): Promise<boolean> {
    try {
      const user = await this.database.findUserByEmail(loginData.email);

      if (user) {
        let passwordValid = false;

        if (this.useEncryption) {
          const decryptedPassword = EncryptionUtil.decrypt(user.password);
          passwordValid = decryptedPassword === loginData.password;
        } else {
          passwordValid = user.password === loginData.password;
        }

        if (passwordValid) {
          const { password, ...userWithoutPassword } = user;
          this.currentUserSubject.next(userWithoutPassword as User);
          localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async register(registerData: RegisterData): Promise<boolean> {
    try {
      console.log('Starting registration with data:', { ...registerData, password: '***' });

      // Проверяем инвайт-код
      const isValidCode = await this.validateInviteCode(registerData.inviteCode);
      console.log('Invite code validation result:', isValidCode);

      if (!isValidCode) {
        return false;
      }

      // Проверяем есть ли пользователь с таким email
      const existingUser = await this.database.findUserByEmail(registerData.email);
      if (existingUser) {
        console.log('User already exists with email:', registerData.email);
        return false;
      }

      if (registerData.password !== registerData.confirmPassword) {
        console.log('Passwords do not match');
        return false;
      }

      if (registerData.password.length < 6) {
        console.log('Password too short');
        return false;
      }

      // Создаем нового пользователя
      const newUser: User = {
        id: this.generateId(),
        name: registerData.name,
        email: registerData.email,
        password: this.useEncryption
          ? EncryptionUtil.encrypt(registerData.password)
          : registerData.password,
        createdAt: new Date()
      };

      console.log('Creating new user:', { ...newUser, password: '***' });

      // Помечаем инвайт-код как использованный
      await this.markInviteCodeAsUsed(registerData.inviteCode, newUser.id);
      console.log('Invite code marked as used:', registerData.inviteCode);

      // Сохраняем пользователя
      await this.database.users.add(newUser);
      console.log('User saved to database');

      // Автоматически логиним
      const { password, ...userWithoutPassword } = newUser;
      this.currentUserSubject.next(userWithoutPassword as User);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  async validateInviteCode(code: string): Promise<boolean> {
    try {
      if (!code || code.trim() === '') {
        return false;
      }

      console.log('Validating invite code:', code);
      const inviteCode = await this.database.findInviteCode(code.trim());
      console.log('Found invite code:', inviteCode);

      if (!inviteCode) {
        console.log('Invite code not found');
        return false;
      }

      if (inviteCode.used) {
        console.log('Invite code already used');
        return false;
      }

      console.log('Invite code is valid');
      return true;
    } catch (error) {
      console.error('Error validating invite code:', error);
      return false;
    }
  }

  private async markInviteCodeAsUsed(code: string, userId: string): Promise<void> {
    try {
      const inviteCode = await this.database.findInviteCode(code);
      if (inviteCode) {
        await this.database.inviteCodes.update(code, {
          used: true,
          usedBy: userId,
          usedAt: new Date()
        });
        console.log('Successfully marked invite code as used:', code);
      }
    } catch (error) {
      console.error('Error marking invite code as used:', error);
      throw error;
    }
  }

  async getAvailableInviteCodes(): Promise<InviteCode[]> {
    try {
      let codes = await this.database.getAvailableInviteCodes();

      // Если нет доступных кодов, создаем новый автоматически
      if (codes.length === 0) {
        console.log('No available invite codes, creating new one...');
        const newCode = await this.createInviteCode();
        if (newCode) {
          // Перезагружаем коды
          codes = await this.database.getAvailableInviteCodes();
        }
      }

      console.log('Available invite codes:', codes.map(c => c.code));
      return codes;
    } catch (error) {
      console.error('Error getting available invite codes:', error);
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

  async getUsedInviteCodes(): Promise<InviteCode[]> {
    try {
      return await this.database.inviteCodes
        .where('used')
        .equals(1)
        .toArray();
    } catch (error) {
      console.error('Error getting used invite codes:', error);
      return [];
    }
  }

  /**
   * Проверяет существование пользователя по email
   */
  async validateUser(email: string): Promise<boolean> {
    try {
      const user = await this.database.findUserByEmail(email);
      return !!user;
    } catch (error) {
      console.error('Error validating user:', error);
      return false;
    }
  }

  /**
   * Получает инвайт-коды пользователя (созданные им)
   */
  async getUserInviteCodes(userId: string): Promise<InviteCode[]> {
    try {
      const currentUser = this.getCurrentUser();

      // Админ видит все коды
      if (currentUser && this.isAdmin(currentUser)) {
        return await this.database.inviteCodes.toArray();
      }

      // Обычный пользователь видит только коды, которые он создал
      return await this.database.inviteCodes
        .where('createdBy')
        .equals(userId)
        .toArray();
    } catch (error) {
      console.error('Error getting user invite codes:', error);
      return [];
    }
  }

  /**
   * Получает инвайт-коды, созданные текущим пользователем
   */
  async getMyInviteCodes(): Promise<InviteCode[]> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return [];
    }

    return this.getUserInviteCodes(currentUser.id);
  }

  /**
   * Создает новый инвайт-код от имени текущего пользователя
   */
  async createInviteCode(): Promise<string | null> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const newCode: InviteCode = {
      code: this.generateRandomCode(),
      createdBy: currentUser.id,
      createdAt: new Date(),
      used: false
    };

    try {
      await this.database.inviteCodes.add(newCode);
      console.log('New invite code created:', newCode.code);
      return newCode.code;
    } catch (error) {
      console.error('Error creating invite code:', error);
      return null;
    }
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

    // Сохраняем в базу
    this.database.inviteCodes.add(newCode).catch(console.error);

    return newCode.code;
  }

  async deleteInviteCode(code: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !this.isAdmin(currentUser)) {
      return false;
    }

    try {
      const inviteCode = await this.database.findInviteCode(code);
      if (!inviteCode || inviteCode.used) {
        return false;
      }

      // Удаляем код из базы
      await this.database.inviteCodes.delete(code);
      console.log('Invite code deleted:', code);

      return true;
    } catch (error) {
      console.error('Delete invite code error:', error);
      return false;
    }
  }

  private async initializeDefaultInviteCodes(): Promise<void> {
    try {
      const allCodes = await this.database.inviteCodes.toArray();
      console.log('Existing codes in DB:', allCodes);

      // Создаем дефолтные коды ТОЛЬКО если в базе вообще нет кодов
      if (allCodes.length === 0) {
        console.log('Initializing default invite codes');

        const defaultCodes: InviteCode[] = this.defaultInviteCodes.map(code => ({
          code: code,
          createdBy: 'system',
          createdAt: new Date(),
          used: false
        }));

        await this.database.inviteCodes.bulkAdd(defaultCodes);
        console.log('Default invite codes initialized:', defaultCodes.map(c => c.code));
      } else {
        console.log('Invite codes already exist, skipping initialization');
        const availableCodes = allCodes.filter(code => !code.used);
        console.log('Available invite codes:', availableCodes.map(c => c.code));
        console.log('Used invite codes:', allCodes.filter(code => code.used).map(c => c.code));
      }
    } catch (error) {
      console.error('Initialize default codes error:', error);
    }
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

  setEncryption(enabled: boolean): void {
    this.useEncryption = enabled;
  }

  isEncryptionEnabled(): boolean {
    return this.useEncryption;
  }

  // Метод для отладки
  async debugInviteCodes(): Promise<void> {
    try {
      const allCodes = await this.database.inviteCodes.toArray();
      console.log('=== DEBUG INVITE CODES ===');
      console.log('Total codes in database:', allCodes.length);
      allCodes.forEach(code => {
        console.log(`Code: ${code.code}, Used: ${code.used}, UsedBy: ${code.usedBy}`);
      });

      const availableCodes = await this.getAvailableInviteCodes();
      console.log('Available codes:', availableCodes.length);
      availableCodes.forEach(code => {
        console.log(`Available: ${code.code}`);
      });
    } catch (error) {
      console.error('Debug error:', error);
    }
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
