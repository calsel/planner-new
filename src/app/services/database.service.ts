import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { User, InviteCode, Task } from '../models/index'

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  users!: Dexie.Table<User, string>;
  tasks!: Dexie.Table<Task, string>;
  inviteCodes!: Dexie.Table<InviteCode, string>;
  appSettings!: Dexie.Table<any, number>;

  constructor() {
    super('ElegantPlannerDB');

    this.version(1).stores({
      users: 'id, email, name, createdAt',
      tasks: 'id, userId, date, completed, priority, status, time',
      inviteCodes: 'code, createdBy, used, usedBy, createdAt',
      appSettings: '++id, migrationVersion, encryptionEnabled'
    });

    this.open().catch(console.error);
  }

  // Поиск пользователя по email
  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.users.where('email').equals(email).first();
  }

  // Поиск инвайт-кода
  async findInviteCode(code: string): Promise<InviteCode | undefined> {
    return this.inviteCodes.where('code').equals(code).first();
  }

  // Получение доступных инвайт-кодов
  async getAvailableInviteCodes(): Promise<InviteCode[]> {
    return this.inviteCodes.where('used').equals(0).toArray();
  }

  // Миграция данных из localStorage в IndexedDB
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // Мигрируем пользователей
      const usersJson = localStorage.getItem('users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        await this.users.bulkPut(users);
        localStorage.removeItem('users');
      }

      // Мигрируем задачи
      const tasksJson = localStorage.getItem('planner-tasks');
      if (tasksJson) {
        const tasks = JSON.parse(tasksJson);
        await this.tasks.bulkPut(tasks);
        localStorage.removeItem('planner-tasks');
      }

      // Мигрируем инвайт-коды
      const inviteCodesJson = localStorage.getItem('invite-codes');
      if (inviteCodesJson) {
        const inviteCodes = JSON.parse(inviteCodesJson);
        await this.inviteCodes.bulkPut(inviteCodes);
        localStorage.removeItem('invite-codes');
      }

      // Сохраняем настройки миграции
      await this.appSettings.put({
        migrationVersion: '1.0.0',
        encryptionEnabled: true,
        migratedAt: new Date()
      }, 1);

      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  // Проверяем нужно ли мигрировать данные
  async shouldMigrate(): Promise<boolean> {
    try {
      const hasLocalStorageData =
        localStorage.getItem('users') ||
        localStorage.getItem('planner-tasks') ||
        localStorage.getItem('invite-codes');

      const migrationDone = await this.appSettings.get(1);

      return !!hasLocalStorageData && !migrationDone;
    } catch (error) {
      console.error('Migration check failed:', error);
      return false;
    }
  }

  // Резервное копирование в localStorage (для совместимости)
  async backupToLocalStorage(): Promise<void> {
    try {
      const users = await this.users.toArray();
      localStorage.setItem('users', JSON.stringify(users));

      const tasks = await this.tasks.toArray();
      localStorage.setItem('planner-tasks', JSON.stringify(tasks));

      const inviteCodes = await this.inviteCodes.toArray();
      localStorage.setItem('invite-codes', JSON.stringify(inviteCodes));
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }

  // Очистка всех данных (для тестирования)
  async clearAllData(): Promise<void> {
    await this.users.clear();
    await this.tasks.clear();
    await this.inviteCodes.clear();
    await this.appSettings.clear();
  }

  // Получение статистики базы данных
  async getDatabaseStats(): Promise<{
    users: number;
    tasks: number;
    inviteCodes: number;
    usedInviteCodes: number;
  }> {
    const usersCount = await this.users.count();
    const tasksCount = await this.tasks.count();
    const inviteCodesCount = await this.inviteCodes.count();
    const usedInviteCodesCount = await this.inviteCodes.where('used').equals(1).count();

    return {
      users: usersCount,
      tasks: tasksCount,
      inviteCodes: inviteCodesCount,
      usedInviteCodes: usedInviteCodesCount
    };
  }
}
