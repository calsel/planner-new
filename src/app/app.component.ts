import { Component, OnInit } from '@angular/core';
import { MigrationService } from './services/migration.service';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit {

  constructor(private migrationService: MigrationService) {}

  async ngOnInit(): Promise<void> {
    // Запускаем миграцию данных при старте приложения
    await this.migrationService.checkAndMigrate();
  }
}
