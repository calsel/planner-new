import { Component } from '@angular/core';
import { DebugService } from './services/debug.service';

// Делаем сервис глобально доступным для отладки
declare global {
  interface Window {
    debugService: DebugService;
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'planner';

  constructor(private debugService: DebugService) {
    // Делаем сервис доступным в глобальной области для отладки
    window.debugService = debugService;

    console.log('🔧 Отладочные команды:');
    console.log('   debugService.debugDatabase() - посмотреть базу данных');
    console.log('   debugService.clearDatabase() - очистить базу данных');
    console.log('   debugService.createAdminCode() - создать админский код');
    console.log('   debugService.createTestUser() - создать тестовый код');
  }
}
