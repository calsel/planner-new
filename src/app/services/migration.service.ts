import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {

  constructor(private database: DatabaseService) {}

  async checkAndMigrate(): Promise<void> {
    try {
      // Проверяем нужно ли мигрировать данные
      if (await this.database.shouldMigrate()) {
        console.log('Starting data migration...');
        await this.database.migrateFromLocalStorage();
        console.log('Data migration completed successfully');
      } else {
        console.log('No migration needed');
      }
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }
}
