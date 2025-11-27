import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { EncryptionUtil } from '../utils/encryption.util';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {
  private readonly MIGRATION_VERSION = '1.1.0';
  private readonly STORAGE_KEY = 'app_migration_version';

  constructor(private authService: AuthService) {}

  async checkAndMigrate(): Promise<void> {
    const currentVersion = localStorage.getItem(this.STORAGE_KEY);

    if (currentVersion !== this.MIGRATION_VERSION) {
      console.log('Starting data migration...');

      try {
        // Мигрируем пароли пользователей
        await this.authService.migrateUserPasswords();

        // Обновляем версию миграции
        localStorage.setItem(this.STORAGE_KEY, this.MIGRATION_VERSION);
        console.log('Data migration completed successfully');
      } catch (error) {
        console.error('Migration failed:', error);
      }
    }
  }

  getMigrationVersion(): string {
    return localStorage.getItem(this.STORAGE_KEY) || '1.0.0';
  }
}
