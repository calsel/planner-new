import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class DebugService {
  constructor(private database: DatabaseService) {}

  // Метод для отладки из консоли браузера
  async debugDatabase() {
    console.log('=== DEBUG DATABASE ===');

    try {
      // Получаем все инвайт-коды
      const inviteCodes = await this.database.inviteCodes.toArray();
      console.log('📋 Инвайт-коды:', inviteCodes);

      // Получаем всех пользователей
      const users = await this.database.users.toArray();
      console.log('👥 Пользователи:', users);

      // Получаем все задачи
      const tasks = await this.database.tasks.toArray();
      console.log('✅ Задачи:', tasks);

      return {
        inviteCodes,
        users,
        tasks
      };
    } catch (error) {
      console.error('Ошибка отладки:', error);
    }
  }

  // Очистка базы данных
  async clearDatabase() {
    console.log('🧹 Очистка базы данных...');

    try {
      await this.database.inviteCodes.clear();
      await this.database.users.clear();
      await this.database.tasks.clear();

      console.log('✅ База данных очищена');

      // Создаем админский код заново
      await this.createAdminCode();

      return true;
    } catch (error) {
      console.error('Ошибка очистки:', error);
      return false;
    }
  }

  // Создание админского кода
  async createAdminCode() {
    try {
      await this.database.inviteCodes.add({
        code: 'ADMIN2024',
        used: false,
        createdAt: new Date(),
        createdBy: 'system',
        isAdminCode: true
      });
      console.log('✅ Админский код создан: ADMIN2024');
    } catch (error) {
      console.log('Админский код уже существует');
    }
  }

  // Создание тестового пользователя
  async createTestUser() {
    try {
      await this.database.inviteCodes.add({
        code: 'TESTUSER1',
        used: false,
        createdAt: new Date(),
        createdBy: 'system'
      });
      console.log('✅ Тестовый код создан: TESTUSER1');
    } catch (error) {
      console.log('Тестовый код уже существует');
    }
  }

  // Проверка существования админского кода
  async checkAdminCode() {
    try {
      const adminCode = await this.database.inviteCodes.get('ADMIN2024');
      console.log('🔍 Проверка админского кода:', adminCode);
      return adminCode;
    } catch (error) {
      console.error('Ошибка проверки админского кода:', error);
      return null;
    }
  }

  // Проверка существования администратора
  async checkAdminUser() {
    try {
      const adminUser = await this.database.users
        .where('isAdmin')
        .equals(1)
        .first();
      console.log('🔍 Проверка администратора:', adminUser);
      return adminUser;
    } catch (error) {
      console.error('Ошибка проверки администратора:', error);
      return null;
    }
  }
}
