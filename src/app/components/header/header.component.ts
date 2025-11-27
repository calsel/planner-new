import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  currentUser: any = null;
  formattedDate: string = new Date().toLocaleDateString('ru-RU');
  isToday: boolean = true;

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  // ДОБАВЛЕНО: недостающие методы
  previousDay() {
    console.log('Previous day clicked');
    // Ваша логика для предыдущего дня
  }

  nextDay() {
    console.log('Next day clicked');
    // Ваша логика для следующего дня
  }

  setToday() {
    console.log('Set today clicked');
    this.isToday = true;
    this.formattedDate = new Date().toLocaleDateString('ru-RU');
    // Ваша логика для установки сегодняшней даты
  }

  logout() {
    this.authService.logout();
  }
}
